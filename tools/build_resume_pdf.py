"""Rebuild assets/Szczechowicz_Philip_Resume.pdf from resume.html.

The PDF uses resume.css's print styles (the Word résumé's Times layout), so the
web page and the download always match. Run after editing resume.html:

  python tools/build_resume_pdf.py

Then check that it is still one page (the script reports the page count).
"""
import pathlib
import re
import shutil
import subprocess
import sys

SITE = pathlib.Path(__file__).resolve().parents[1]
OUT = SITE / 'assets' / 'Szczechowicz_Philip_Resume.pdf'
BROWSERS = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    shutil.which('chrome') or '', shutil.which('msedge') or '',
]


def main():
    browser = next((b for b in BROWSERS if b and pathlib.Path(b).exists()), None)
    if not browser:
        sys.exit('Chrome or Edge not found.')
    source = (SITE / 'resume.html').as_uri()
    subprocess.run([browser, '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
                    f'--print-to-pdf={OUT}', source], check=True, capture_output=True, timeout=120)
    pages = len(re.findall(rb'/Type\s*/Page[^s]', OUT.read_bytes()))
    print(f'Wrote {OUT.relative_to(SITE)} ({pages} page{"s" if pages != 1 else ""})')
    if pages != 1:
        sys.exit('Résumé is longer than one page; tighten resume.html or the print styles.')


if __name__ == '__main__':
    main()
