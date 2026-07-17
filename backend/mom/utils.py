import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def safe_date_str(d):
    if not d: return ''
    if hasattr(d, 'strftime'): return d.strftime('%Y-%m-%d')
    return str(d)

def safe_time_str(t):
    if not t: return ''
    if hasattr(t, 'strftime'): return t.strftime('%H:%M')
    return str(t)

def safe_year(d):
    if hasattr(d, 'year'): return d.year
    if isinstance(d, str) and len(d) >= 4: return d[:4]
    return 'XXXX'

def generate_mom_pdf(mom):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    elements = []
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=16,
        textColor=colors.white,
        spaceAfter=10,
        fontName='Helvetica-Bold'
    )
    
    subheader_style = ParagraphStyle(
        'SubHeaderStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.white,
        fontName='Helvetica'
    )

    section_style = ParagraphStyle(
        'SectionStyle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#2E5CA3'),
        spaceAfter=5,
        fontName='Helvetica-Bold'
    )

    # 1. Main Header Table (WORKHUB FACILITY MANAGEMENT)
    header_data = [
        [
            Paragraph("WORKHUB FACILITY MANAGEMENT", header_style),
            Paragraph(f"MOM No: MOM-{safe_year(mom.meeting_date)}-{mom.id if mom.id else 'XXX'}", subheader_style)
        ],
        [
            Paragraph("Minutes of Meeting", subheader_style),
            Paragraph(f"Status: {mom.get_meeting_status_display() if mom.meeting_status else 'Draft'}", subheader_style)
        ]
    ]
    header_table = Table(header_data, colWidths=['65%', '35%'])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#2E5CA3')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 20))

    # 1. Meeting Information
    elements.append(Paragraph("1. Meeting Information", section_style))
    info_data = [
        ['Client Name', mom.client_name or ''],
        ['Site Name', mom.site_name or ''],
        ['Location', mom.location or ''],
        ['Meeting Date', safe_date_str(mom.meeting_date)],
        ['Start Time', safe_time_str(mom.start_time)],
        ['End Time', safe_time_str(mom.end_time)],
        ['Meeting Type', mom.get_meeting_type_display() if hasattr(mom, 'get_meeting_type_display') and mom.meeting_type else ''],
        ['Prepared By', mom.prepared_by or ''],
        ['Meeting Status', mom.get_meeting_status_display() if hasattr(mom, 'get_meeting_status_display') and mom.meeting_status else ''],
    ]
    info_table = Table(info_data, colWidths=['30%', '70%'])
    info_table_style = TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F5F7FA')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ])
    info_table.setStyle(info_table_style)
    elements.append(info_table)
    elements.append(Spacer(1, 20))

    # 2. Attendees
    elements.append(Paragraph("2. Attendees", section_style))
    attendee_data = [['#', 'Name', 'Designation', 'Email', 'Type']]
    attendees = list(mom.attendees.all())
    for idx, att in enumerate(attendees, start=1):
        if att.is_external:
            name = att.name or ''
            email = att.email or ''
            type_str = 'Client'
            designation = 'Client'
        else:
            name = att.user.get_full_name() or att.user.username if att.user else ''
            email = att.user.email if att.user else ''
            type_str = 'Internal'
            designation = 'Staff'
            if att.user:
                try:
                    # Try to fetch from EmployeeProfile (department name)
                    if hasattr(att.user, 'employee_profile') and att.user.employee_profile.department:
                        designation = att.user.employee_profile.department.name
                    # Fallback to UserProfile role
                    elif hasattr(att.user, 'auth_profile'):
                        designation = att.user.auth_profile.get_role_display()
                except Exception:
                    pass
        
        attendee_data.append([str(idx), name, designation, email, type_str])
    
    if len(attendee_data) == 1:
        attendee_data.append(['', 'No attendees found', '', '', ''])

    att_table = Table(attendee_data, colWidths=['5%', '30%', '25%', '30%', '10%'])
    att_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E5CA3')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(att_table)
    elements.append(Spacer(1, 20))

    # 3. Meeting Agenda
    elements.append(Paragraph("3. Meeting Agenda", section_style))
    agenda_data = [['Sr No', 'Agenda Topic', 'Discussion Remarks']]
    agendas = list(mom.agendas.all())
    for idx, ag in enumerate(agendas, start=1):
        agenda_data.append([
            str(idx),
            Paragraph(ag.topic, styles['Normal']),
            Paragraph(ag.remarks or '', styles['Normal'])
        ])
    
    if len(agenda_data) == 1:
        agenda_data.append(['', 'No agenda items', ''])

    ag_table = Table(agenda_data, colWidths=['10%', '40%', '50%'])
    ag_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E5CA3')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(ag_table)
    elements.append(Spacer(1, 20))

    # 4. Action Plan / Next Steps
    elements.append(Paragraph("4. Action Plan / Next Steps", section_style))
    action_data = [['Sr', 'Action Item', 'Responsible', 'Department', 'Priority', 'Planned', 'Actual', 'Status']]
    points = list(mom.points.all())
    for idx, pt in enumerate(points, start=1):
        resp = pt.assigned_to.get_full_name() or pt.assigned_to.username if pt.assigned_to else '-'
        action_data.append([
            str(idx),
            Paragraph(pt.text, styles['Normal']),
            resp,
            pt.department or '-',
            pt.priority,
            safe_date_str(pt.planned_date) if pt.planned_date else '-',
            safe_date_str(pt.actual_date) if pt.actual_date else '-',
            pt.status
        ])

    if len(action_data) == 1:
        action_data.append(['', 'No action items', '', '', '', '', '', ''])

    ac_table = Table(action_data, colWidths=['5%', '30%', '15%', '15%', '10%', '10%', '10%', '5%'])
    ac_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E5CA3')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(ac_table)
    elements.append(Spacer(1, 40))

    # 5. Approval Signatures
    elements.append(Paragraph("5. Approval Signatures", section_style))
    sig_data = [
        ['Prepared By', 'Reviewed By', 'Approved By'],
        ['\n\n\n\n______________________', '\n\n\n\n______________________', '\n\n\n\n______________________'],
        [mom.prepared_by or '______________________', '______________________', mom.client_name or '______________________']
    ]
    sig_table = Table(sig_data, colWidths=['33%', '34%', '33%'])
    sig_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F5F7FA')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(sig_table)
    
    # Footer
    elements.append(Spacer(1, 40))
    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey,
        alignment=1 # Center
    )
    elements.append(Paragraph("Workhub Facility Management • Confidential", footer_style))

    doc.build(elements)
    
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
