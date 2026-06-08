import sys
import subprocess
import os

def install_package(package):
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
    except Exception as e:
        print(f"Error installing {package}: {e}")

install_package("python-docx")
install_package("markdown")
install_package("htmldocx")

import markdown
from htmldocx import HtmlToDocx
from docx import Document
from docx.shared import Pt

md_path = r"C:\VietSign-AI-v2\Bao_Cao_Bai_Tap_Lon_Template_Goc_25Trang.md"
docx_path = r"C:\Users\Admin\Downloads\Bao_Cao_Bai_Tap_Lon_VietSign_Final.docx"

print("Reading Markdown...")
with open(md_path, 'r', encoding='utf-8') as f:
    text = f.read()

print("Converting to HTML...")
html = markdown.markdown(text, extensions=['fenced_code', 'tables'])

print("Creating doc...")
doc = Document()

# Định dạng cơ bản cho style Normal
style = doc.styles['Normal']
font = style.font
font.name = 'Times New Roman'
font.size = Pt(13)

parser = HtmlToDocx()
parser.add_html_to_document(html, doc)

# Tinh chỉnh dãn dòng 1.5 cho tất cả paragraph
for para in doc.paragraphs:
    para.paragraph_format.line_spacing = 1.5
    for run in para.runs:
        run.font.name = 'Times New Roman'
        if not run.font.size:
            run.font.size = Pt(13)

doc.save(docx_path)
print(f"Saved to: {docx_path}")
