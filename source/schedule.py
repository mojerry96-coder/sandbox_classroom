"""Place each narration line on the recording's timeline (writes sched.json for compose.py).

Run after record.py, from the video work dir (default source/video), with the narration in
source/narration/s1.wav ... s15.wav (24 kHz mono). A line starts at its anchor (a fixed time, or a mark
record.py set when the matching action happens), but never before the previous line has ended.
"""
import json, os, soundfile as sf
NARR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "narration")

GAP = 0.25  # minimum silence between consecutive lines
# (caption text, anchor): anchor is seconds, a record.py mark name, or None to follow on
LINES = [
    ("Welcome to your sandbox class.", 0.6),
    ("Everything here is practice, and nothing reaches a real student.", None),
    ("First, choose how you want to rehearse: as a teacher, or as a student.", "role"),
    ("A teacher starts with nothing at all, just as you would in Classroom.", "home"),
    ("So create your class. Give it a name, and it opens with its own class code.", "create"),
    ("Use Stream to share announcements. Write a message, post it, and see where it appears.", "stream"),
    ("Classwork keeps learning materials organised.", "classwork"),
    ("Create a topic, then file an assignment beneath it so students can find their work.", None),
    ("People is where you invite students.", "people"),
    ("They stay Invited until they join, exactly as they would in the real thing.", "invited"),
    ("Grades fills in once there are students and work to mark.", "grades"),
    ("Need support? Open Practice Help for an explanation, guided steps, or this walkthrough.", "help"),
    ("Review what you tried and decide what needs more practice. There is no score.", "summary"),
    ("Reset whenever you want, and start the whole thing again.", None),
    ("Your turn — Begin Practice.", "endcard"),
]

marks = json.load(open("timeline.json"))["marks"]
sched, end = [], 0.0
for i, (text, anchor) in enumerate(LINES, 1):
    info = sf.info(os.path.join(NARR, f"s{i}.wav"))
    d = round(info.frames / info.samplerate, 2)
    at = marks[anchor] if isinstance(anchor, str) else (anchor or 0.0)
    s = round(max(at, end + GAP if i > 1 else at), 2)
    sched.append({"i": i, "s": s, "d": d, "t": text})
    end = s + d
json.dump(sched, open("sched.json", "w"), indent=1)
for o in sched:
    print(f"s{o['i']:<3}{o['s']:6.2f} +{o['d']:4.2f}  {o['t'][:60]}")
