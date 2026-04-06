#!/usr/bin/env python3
"""
Generate PDF from HTML handout using WeasyPrint
"""

from weasyprint import HTML, CSS
import os

def generate_pdf():
    """Convert HTML handout to PDF"""
    
    # Input and output files
    html_file = "resgrid-eso-sync-quick-reference.html"
    pdf_file = "Resgrid-ESO-Sync-Quick-Reference.pdf"
    
    # Check if HTML file exists
    if not os.path.exists(html_file):
        print(f"Error: {html_file} not found")
        return False
    
    try:
        # Generate PDF from HTML
        print(f"Converting {html_file} to PDF...")
        HTML(filename=html_file).write_pdf(pdf_file)
        
        print(f"✅ PDF generated successfully: {pdf_file}")
        
        # Check file size
        file_size = os.path.getsize(pdf_file)
        print(f"📄 PDF file size: {file_size:,} bytes ({file_size/1024:.1f} KB)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error generating PDF: {e}")
        return False

if __name__ == "__main__":
    success = generate_pdf()
    if not success:
        exit(1)