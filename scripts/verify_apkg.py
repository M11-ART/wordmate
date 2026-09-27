# 验证生成的 .apkg 是否为合法 Anki 牌组
import zipfile
import sqlite3
import json
import tempfile
import os
import sys

apkg = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\马浩阳\Downloads\WordMate-cet4.apkg'

z = zipfile.ZipFile(apkg)
names = z.namelist()
print('ZIP 内容:', names)

colname = 'collection.anki21' if 'collection.anki21' in names else 'collection.anki2'
tmp = os.path.join(tempfile.gettempdir(), 'col_check.anki21')
with open(tmp, 'wb') as f:
    f.write(z.read(colname))

con = sqlite3.connect(tmp)
print('笔记数 notes:', con.execute('select count(*) from notes').fetchone()[0])
print('卡片数 cards:', con.execute('select count(*) from cards').fetchone()[0])

row = con.execute('select flds,tags from notes limit 1').fetchone()
print('示例笔记字段:', row[0][:160])
print('示例笔记标签:', row[1])

col = json.loads(con.execute('select decks from col').fetchone()[0])
print('牌组:', [d['name'] for d in col.values()])

conf = json.loads(con.execute('select config from col').fetchone()[0])
for c in conf.values():
    if isinstance(c, dict) and 'name' in c and 'WordMate' in str(c.get('name', '')):
        print('调度配置:', c.get('name'), 'newPerDay=', c.get('new', {}).get('perDay') if isinstance(c.get('new'), dict) else c.get('newPerDay'))
con.close()
print('验证通过')
