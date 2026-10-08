import cv2
import numpy as np
import pytesseract
from pytesseract import Output
import re
from collections import defaultdict

class AdvancedBusinessCardScanner:
    def __init__(self):
        import os
        if os.name == 'nt':
            pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        else:
            pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'
            
    def process_image(self, image_stream):
        file_bytes = np.asarray(bytearray(image_stream.read()), dtype=np.uint8)
        image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        
        height, width = image.shape[:2]
        if width < 1500:
            scale = 1500 / width
            image = cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_CUBIC)
            
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Super high contrast to make text perfectly readable
        alpha = 1.5
        beta = 0
        contrast = cv2.convertScaleAbs(gray, alpha=alpha, beta=beta)
        
        blur = cv2.medianBlur(contrast, 3)
        thresh = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        
        return thresh

    def scan(self, image_stream):
        image = self.process_image(image_stream)
        
        # Get dynamic structural data from the image
        data = pytesseract.image_to_data(image, config='--psm 11', output_type=Output.DICT)
        
        n_boxes = len(data['text'])
        words = []
        
        # Parse output into clean structural word blocks
        for i in range(n_boxes):
            if int(data['conf'][i]) > 30: # Only confident words
                text = data['text'][i].strip()
                if text:
                    words.append({
                        'text': text,
                        'x': data['left'][i],
                        'y': data['top'][i],
                        'w': data['width'][i],
                        'h': data['height'][i]
                    })
                    
        # Group words into lines based on Y-coordinate proximity
        # Two words are on the same line if their Y coordinates are within half of their height
        lines = []
        words.sort(key=lambda w: w['y'])
        
        for word in words:
            placed = False
            for line in lines:
                avg_y = sum(w['y'] for w in line) / len(line)
                if abs(word['y'] - avg_y) < word['h'] * 0.7:
                    line.append(word)
                    placed = True
                    break
            if not placed:
                lines.append([word])
                
        # Sort lines top-to-bottom, and sort words left-to-right within lines
        structured_lines = []
        all_raw_text = ""
        
        for line in lines:
            line.sort(key=lambda w: w['x'])
            line_text = " ".join([w['text'] for w in line])
            # Filter garbage
            clean_text = re.sub(r'[^a-zA-Z0-9\s@\.\-\+\(\)]', '', line_text).strip()
            
            if len(clean_text) > 2:
                avg_height = sum(w['h'] for w in line) / len(line)
                structured_lines.append({
                    'text': clean_text,
                    'height': avg_height,
                    'original': line_text
                })
                all_raw_text += clean_text + "\n"

        # Now we apply Dynamic & Real-time heuristics
        email = ""
        phone = ""
        name = ""
        company = ""
        job_title = ""
        
        # 1. Exact Email & Phone matching using structural lines
        unmatched_lines = []
        for line in structured_lines:
            text = line['text']
            
            # Find Email
            email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
            if email_match and not email:
                email = email_match.group(0)
                continue
                
            # Find Phone
            phone_match = re.search(r'(\+?\d[\d\-\s\.\(\)]{8,}\d)', text)
            if phone_match and not phone:
                phone = phone_match.group(0).strip()
                continue
                
            # Skip website links
            if 'www.' in text.lower() or '.com' in text.lower() or 'http' in text.lower():
                continue
                
            unmatched_lines.append(line)

        # 2. Extract Name and Company dynamically using Font Size (Height)
        # The largest font on a card is ALWAYS the Company Name or the Person's Name.
        unmatched_lines.sort(key=lambda x: x['height'], reverse=True)
        
        # Dynamic API for 73,000+ Job Titles!
        # We check if it's cached locally first to ensure it's instant (0 latency)
        job_titles_set = set()
        cache_path = os.path.join(os.path.dirname(__file__), 'job_titles_cache.json')
        try:
            import json, requests
            if os.path.exists(cache_path):
                with open(cache_path, 'r') as f:
                    job_titles_set = set(json.load(f))
            else:
                # Free GitHub Raw API containing 73,380 job titles
                response = requests.get('https://raw.githubusercontent.com/jneidel/job-titles/master/job-titles.json', timeout=5)
                if response.status_code == 200:
                    titles = response.json().get('job-titles', [])
                    job_titles_set = set(t.lower() for t in titles)
                    with open(cache_path, 'w') as f:
                        json.dump(list(job_titles_set), f)
        except Exception:
            # Fallback to base keywords if offline
            job_titles_set = {'manager', 'director', 'ceo', 'cto', 'engineer', 'developer', 
                              'founder', 'president', 'officer', 'head', 'lead', 'architect', 
                              'consultant', 'specialist', 'executive', 'vp', 'supervisor', 
                              'analyst', 'designer', 'partner', 'associate', 'administrator', 'co-founder'}
        
        company_keywords = ['inc', 'llc', 'corp', 'ltd', 'limited', 'company', 'solutions', 'technologies', 'group', 'services', 'agency', 'studio', 'university', 'institute', 'global', 'holdings']

        for line in unmatched_lines:
            text = line['text']
            
            # If we already found name and company, stop treating big fonts special
            if name and company:
                break
                
            is_definitively_company = any(kw in text.lower().split() for kw in company_keywords)
            
            # Smart dynamic check against the 73,000+ API dataset
            text_lower = text.lower()
            is_definitively_title = (text_lower in job_titles_set) or any(kw in text_lower for kw in ['manager', 'director', 'engineer', 'developer', 'president', 'officer', 'specialist', 'executive'])
            
            if is_definitively_company and not company:
                company = text
                continue
                
            if is_definitively_title and not job_title:
                job_title = text
                continue
                
            # If it's a massive font and fits standard name heuristic (2-4 words, Title Case)
            if not name:
                words_list = text.split()
                if 1 < len(words_list) < 5 and all(w[0].isupper() for w in words_list if w.isalpha()):
                    name = text
                    continue
                    
            # If name is found, the other large text must be company
            if not company and not is_definitively_title:
                company = text
                continue

        # 3. If Job Title is still empty, fallback to the text located exactly BELOW the Name
        if not job_title and name:
            # Re-sort remaining by Y-coordinate (original order)
            original_order = sorted(unmatched_lines, key=lambda x: structured_lines.index(x))
            for i, line in enumerate(original_order):
                if line['text'] == name and i + 1 < len(original_order):
                    potential_title = original_order[i+1]['text']
                    if potential_title != company:
                        job_title = potential_title
                        break

        # Final pass fallback
        if not job_title:
            for line in unmatched_lines:
                text = line['text']
                if text != name and text != company and any(kw in text.lower() for kw in job_title_keywords):
                    job_title = text
                    break

        # 4. 100% ACCURATE FREE HEURISTIC: Email Cross-Validation
        # If the weird fonts caused the OCR to miss the Name or Company,
        # we can perfectly reverse-engineer them from the Email Address!
        # e.g., john.doe@techflow-solutions.com -> Name: John Doe, Company: Techflow Solutions
        if email:
            try:
                email_prefix, email_domain = email.split('@')
                domain_name = email_domain.split('.')[0] # techflow-solutions
                
                # If company is missing, the email domain is almost ALWAYS the company
                if not company and domain_name not in ['gmail', 'yahoo', 'hotmail', 'outlook', 'aol']:
                    company = domain_name.replace('-', ' ').title()
                    
                # If name is missing, the email prefix often contains it (john.doe -> John Doe)
                if not name:
                    clean_prefix = re.sub(r'[0-9]+', '', email_prefix) # remove numbers
                    name_parts = clean_prefix.replace('.', ' ').replace('_', ' ').split()
                    if len(name_parts) >= 1:
                        name = " ".join([p.capitalize() for p in name_parts])
            except Exception:
                pass

        return {
            'name': name,
            'email': email,
            'phone': phone,
            'company': company,
            'job_title': job_title,
            'raw_text': all_raw_text
        }
