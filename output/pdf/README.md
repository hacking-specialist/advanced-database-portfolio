# Final portfolio summary

`portfolio-summary.pdf` is a three-page report generated from the recorded experiment results. Every page was rendered and visually checked for clipping and overlap. It includes the student's original ERD, measured query results and the observed failover outcome. Personal details are omitted.

To regenerate with Python installed:

```powershell
python -m pip install reportlab pypdf pypdfium2
python tools/build_summary.py
```

Run those commands from the repository root. The generator reads the benchmark and replication JSON and renders review images under ignored `tmp/pdfs/`. Check all three rendered pages before submitting a regenerated version. Update accompanying Markdown analysis if measurements change.
