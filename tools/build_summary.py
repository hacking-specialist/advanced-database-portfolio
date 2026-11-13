"""Create the three-page summary from recorded results. Requires reportlab, pypdf, pypdfium2."""
from pathlib import Path
import json
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'output' / 'pdf'
OUT.mkdir(parents=True, exist_ok=True)
TMP = ROOT / 'tmp' / 'pdfs'
TMP.mkdir(parents=True, exist_ok=True)
benchmark = json.loads((ROOT / 'portfolio-2-query-optimisation/results/benchmark.json').read_text())
replica = json.loads((ROOT / 'portfolio-5-distributed-cloud/evidence/replication-results.json').read_text())
navy = colors.HexColor('#16324f')
teal = colors.HexColor('#087e8b')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleCustom', fontName='Helvetica-Bold', fontSize=23, leading=27, textColor=navy, spaceAfter=12))
styles.add(ParagraphStyle(name='HeadingCustom', fontName='Helvetica-Bold', fontSize=13, leading=17, textColor=navy, spaceBefore=12, spaceAfter=6))
styles.add(ParagraphStyle(name='BodyCustom', fontName='Helvetica', fontSize=10, leading=14, spaceAfter=7))
styles.add(ParagraphStyle(name='SmallCustom', fontName='Helvetica', fontSize=8.2, leading=11, textColor=colors.HexColor('#455568'), spaceAfter=6))
story = []
def p(text, style='BodyCustom'):
    story.append(Paragraph(text, styles[style]))
def h(text): p(text, 'HeadingCustom')
def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(teal)
    canvas.line(44, 42, A4[0]-44, 42)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(navy)
    canvas.drawString(44, 29, 'Library Management System | Advanced Database Systems Portfolio')
    canvas.drawRightString(A4[0]-44, 29, f'{doc.page} / 3')
    canvas.restoreState()

p('Library Management<br/>Database Portfolio', 'TitleCustom')
p('DESIGN, IMPLEMENTATION AND EVALUATION | 13 NOVEMBER 2026', 'SmallCustom')
p('<b>Organisation:</b> MIVA Library Service - hypothetical academic case study.<br/>'
  '<b>Student / ID / course:</b> intentionally omitted for private completion.<br/>'
  '<b>Repository:</b> <link href="https://github.com/hacking-specialist/advanced-database-portfolio" color="#087e8b">github.com/hacking-specialist/advanced-database-portfolio</link>')
h('1. Scope and relational design')
p('The prototype manages books, physical copies, borrowers, staff, loans, returns and fines. '
  'It uses synthetic records and preserves the student-supplied seven-table ER diagram. '
  'Books and copies are separate because different physical items of one title have separate lending histories.')
erd = Image(str(ROOT/'portfolio-1-database-design/diagrams/erd.png'), width=507, height=507*645/2675)
story.append(erd)
p('Figure 1. Original student-supplied ER diagram, preserved unchanged.', 'SmallCustom')
p('PostgreSQL 18.6 implements generated primary keys, foreign keys, unique emails and checked dates/amounts. '
  'A unique return loan reference permits at most one return per loan. A partial unique index allows historical '
  'loans for a copy but only one active loan. The documentation explains functional dependencies through 3NF '
  'under the chosen single-author and single-genre interpretation.')
h('2. Implemented workflows and validation')
p('Atomic functions issue, extend and return loans. Assumed policies include verified borrower emails, active staff, '
  '14-day default loans, at most two extensions and NGN 100 per overdue day assessed at return. '
  'These are exercise rules, not verified institutional policies.')
p('Both embedded and native PostgreSQL checks passed: invalid references, dates and amounts were rejected; '
  'active-loan uniqueness, return chronology, damage notes, fine calculation and rollback were checked. '
  'Seed queries returned seven available copies and zero detected workflow inconsistencies.')
p('<b>Design limit:</b> copy/loan status redundancy is maintained through the functions. Direct database-owner writes '
  'can bypass workflow rules. Role hardening, payment auditing and ISBN checksum validation remain future work.')
p('<b>Evidence:</b> portfolio-1-database-design/sql/ and evidence/native-validation.json. '
  'The original ERD and data dictionary are included in Portfolio 1.', 'SmallCustom')
story.append(PageBreak())

p('Queries and concurrency', 'TitleCustom')
h('3. Measured query optimisation')
p('A separate analytical loans table contains 200,000 deterministic rows. Five query variants were measured '
  'before/after indexing, with seven recorded EXPLAIN ANALYZE trials per phase. Complete outputs were checked '
  'for equality. These are repeated, largely warm-cache measurements on a shared Windows host, '
  'including instrumentation overhead; they are not production performance guarantees.')
names = [('borrower_history','Borrower history'),('active_due_range','Active due-date range'),
         ('status_aggregation','Status aggregation'),('year_extract','EXTRACT year filter'),('year_range','Half-open year range')]
rows = [['Query','Before median (ms)','After median (ms)']]
for key,label in names:
    rows.append([label, f"{benchmark['phases']['before'][key]['median_ms']:.3f}", f"{benchmark['phases']['after'][key]['median_ms']:.3f}"])
table = Table(rows,colWidths=[237,135,135],hAlign='LEFT')
table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),navy),('TEXTCOLOR',(0,0),(-1,0),colors.white),
  ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),9),
  ('BOTTOMPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),9),
  ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#edf4f8'),colors.white]),('ALIGN',(1,1),(-1,-1),'RIGHT')]))
story.append(table); story.append(Spacer(1,10))
p('Selective borrower and due-date searches changed from sequential to bitmap index scans, although sorting remained. '
  'Whole-table aggregation kept a sequential scan; its small timing change is not attributed to indexing. '
  'A half-open date predicate enabled an indexed plan while EXTRACT on the column did not. '
  'Additional indexes increased storage; write overhead was not measured.')
h('4. Real multi-session transaction experiments')
p('Three native PostgreSQL connections provided sessions A, B and an observer. Commit persisted an issue; '
  'rollback restored availability. When two borrowers attempted the same copy, the observer recorded a real '
  'lock wait. After A committed, B failed as unavailable and exactly one active loan remained.')
p('Read Committed returned 20,000 then 21,000 after another connection committed an update. Repeatable Read '
  'returned 21,000 on both reads despite a later committed change. This demonstrates a stable transaction snapshot; '
  'it is not a dirty-read example.')
p('Deliberately writing stale client-computed values lost an increment and produced 22,200. Atomic SQL increments '
  'preserved both additions and produced 22,300. Locking, isolation and application update logic therefore address '
  'different aspects of correctness.')
p('<b>Evidence:</b> Portfolio 2 contains 70 recorded plans, JSON query results, benchmark metadata and summary.csv. '
  'Portfolio 3 contains timestamped SQL/events, observed blocking and assertion results.', 'SmallCustom')
story.append(PageBreak())

p('Documents and distribution', 'TitleCustom')
h('5. NoSQL implementation')
p('MongoDB 8.0.17 stores a five-title catalogue with embedded author metadata and genre arrays plus copy-ID references. '
  'This is a documented document-model extension; the relational ERD is unchanged. Actual CRUD operations passed, '
  'negative costs and duplicate ISBNs were rejected, and aggregation returned three Computing titles averaging '
  'NGN 19,000 replacement cost. No live PostgreSQL-to-MongoDB synchronisation is claimed.')
h('6. Replication, availability and cloud discussion')
p('Three actual MongoDB processes formed a replica set on one host. A majority-written marker was checked on '
  'every member. The primary process was stopped; a different primary was observed after '
  f"{replica['observed_recovery_ms']:,} ms from the start of that stop operation. A subsequent majority write/read succeeded. "
  'This single controlled result is not a recovery SLA, network-partition test or cloud deployment.')
p('Majority acknowledgement does not mean every secondary has already applied a write. Three processes on one '
  'computer share the same host-failure boundary. Replication is not a backup. The proposed cloud design separates '
  'members across availability zones and adds authentication, TLS, monitoring and tested backups. Sharding is '
  'analysed as a possible future choice, not reported as implemented.')
h('7. Technical reflection and submission status')
p('The evidence shows why constraints and workflow logic must be considered together, why query plans are needed '
  'to interpret timings, and why availability claims must name the failure being survived. Future improvements '
  'include least-privilege roles, payment audit records, skewed workload tests, catalogue synchronisation and '
  'backup/restore exercises. The student must personalise the separate individual reflection using work they '
  'actually reviewed or performed.')
p('The repository includes scripts, outputs and transcripts; generated summaries are not presented as tool screenshots. '
  'The repository was observed as public and must be made private for the course. Continued genuine weekly work '
  'is needed to demonstrate three months of maintenance. No backdated activity is claimed.')
h('References and AI-use declaration')
p('Primary references: PostgreSQL 18 documentation on constraints, EXPLAIN, partial indexes, isolation and locking; '
  'MongoDB documentation on modelling, validation, elections and read/write concern. Full links are in '
  'documentation/references.md.', 'SmallCustom')
p('OpenAI Codex assisted with implementation, synthetic data, experiment execution, analysis and documentation. '
  'Actual outputs are retained. AI assistance does not establish the student\'s personal understanding. '
  'Personal details were omitted on request; the individual declaration/reflection must be reviewed before submission.', 'SmallCustom')

target = OUT/'portfolio-summary.pdf'
doc = SimpleDocTemplate(str(target),pagesize=A4,rightMargin=44,leftMargin=44,topMargin=39,bottomMargin=56,
                        title='Advanced Database Systems Portfolio - Library Management System',author='')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
reader = PdfReader(target)
assert len(reader.pages)==3, f'Expected exactly three pages, found {len(reader.pages)}'
pdf = pdfium.PdfDocument(target)
for i in range(len(pdf)):
    pdf[i].render(scale=1.4).to_pil().save(TMP/f'summary-page-{i+1}.png')
print(f'Created and rendered {len(reader.pages)} pages: {target}')
