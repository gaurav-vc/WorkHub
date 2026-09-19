import cv2
import numpy as np
import pytesseract
import re

class AdvancedBusinessCardScanner:
    def __init__(self):
        import os
        if os.name == 'nt':
            pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        else:
            pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'
            
    def process_image_variations(self, image_stream):
        # Read image from stream
        file_bytes = np.asarray(bytearray(image_stream.read()), dtype=np.uint8)
        image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        
        # Base preprocessing (Resize if too small to vastly improve OCR accuracy)
        height, width = image.shape[:2]
        if width < 1500:
            scale = 1500 / width
            image = cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_CUBIC)
            
        # 1. Grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 2. High Contrast
        alpha = 1.5
        beta = 0
        contrast = cv2.convertScaleAbs(gray, alpha=alpha, beta=beta)
        
        # 3. Adaptive Thresholding (Removes shadows)
        blur = cv2.medianBlur(gray, 3)
        thresh = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        
        # 4. Sharpening (Helps with blurry photos)
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        sharpened = cv2.filter2D(gray, -1, kernel)
        
        # Return 4 different views of the exact same card
        return [gray, contrast, thresh, sharpened]

    def extract_info(self, combined_text):
        # 1. Exact Email & Phone matching
        email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', combined_text)
        # Phone regex allowing international, spaces, dots, dashes
        phone_match = re.search(r'(\+?\d[\d\-\s\.\(\)]{8,}\d)', combined_text)
        
        email = email_match.group(0).strip() if email_match else ""
        phone = phone_match.group(0).strip() if phone_match else ""
        
        # Clean up lines
        lines = [line.strip() for line in combined_text.split('\n') if len(line.strip()) > 2]
        
        # Remove duplicates while preserving order
        seen = set()
        unique_lines = []
        for line in lines:
            # clean noise
            clean = re.sub(r'^[^a-zA-Z0-9]+', '', line)
            clean = re.sub(r'[^a-zA-Z0-9]+$', '', clean).strip()
            if len(clean) > 2 and clean.lower() not in seen:
                seen.add(clean.lower())
                unique_lines.append(clean)
                
        valid_lines = []
        for line in unique_lines:
            if sum(c.isdigit() for c in line) > 4: continue # Phone/Fax
            if '@' in line: continue # Email
            if 'www.' in line.lower() or '.com' in line.lower() or 'http' in line.lower(): continue # Web
            valid_lines.append(line)
        
        name = ""
        company = ""
        job_title = ""
        
        job_title_keywords = ['manager', 'director', 'ceo', 'cto', 'engineer', 'developer', 
                              'founder', 'president', 'officer', 'head', 'lead', 'architect', 
                              'consultant', 'specialist', 'executive', 'vp', 'supervisor', 
                              'analyst', 'designer', 'partner', 'associate', 'administrator', 'co-founder']
        
        company_keywords = ['inc', 'llc', 'corp', 'ltd', 'limited', 'company', 'solutions', 'technologies', 'group', 'services', 'agency', 'studio', 'university', 'institute']

        # 3. Extract Job Title
        for line in valid_lines:
            if any(kw in line.lower() for kw in job_title_keywords):
                job_title = line
                break
        if job_title in valid_lines:
            valid_lines.remove(job_title)
            
        # 4. Extract Company
        for line in valid_lines:
            if any(kw in line.lower() for kw in company_keywords):
                company = line
                break
        if company in valid_lines:
            valid_lines.remove(company)
            
        # 5. Extract Name (Heuristic: 2-3 words, capitalized, no numbers)
        for line in valid_lines:
            words = line.split()
            if 2 <= len(words) <= 4:
                # Require each alphabetical word to be capitalized
                if all(w[0].isupper() for w in words if w.isalpha()):
                    if not any(c.isdigit() for c in line):
                        # Avoid random all caps words that aren't names
                        if line.isupper() and len(line.split()) == 2:
                            if not name: name = line
                        else:
                            name = line
                            break
        if name in valid_lines:
            valid_lines.remove(name)
            
        # Fallbacks
        if not company and valid_lines:
            company = valid_lines[0]

        return {
            'name': name,
            'email': email,
            'phone': phone,
            'company': company,
            'job_title': job_title,
            'raw_text': combined_text
        }
        
    def scan(self, image_stream):
        image_variations = self.process_image_variations(image_stream)
        
        all_text = ""
        
        # ENSEMBLE OCR: We run Tesseract 8 times!
        # 4 different Image Filters x 2 different Page Segmentation Modes.
        # This takes 3-5 seconds locally but guarantees we catch every possible letter.
        for img in image_variations:
            # PSM 3: Auto page segmentation (Good for standard layouts)
            text3 = pytesseract.image_to_string(img, config='--psm 3')
            # PSM 11: Sparse text (Good for scattered names/phones)
            text11 = pytesseract.image_to_string(img, config='--psm 11')
            
            all_text += "\n" + text3 + "\n" + text11
            
        return self.extract_info(all_text)
