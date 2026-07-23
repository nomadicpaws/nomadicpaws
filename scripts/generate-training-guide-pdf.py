from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image, KeepTogether, NextPageTemplate, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "downloads" / "how-to-leash-train-your-cat.pdf"
LOGO = ROOT / "apple-touch-icon.png"
OUT.parent.mkdir(parents=True, exist_ok=True)

font_dir = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("NPSerif", str(font_dir / "georgia.ttf")))
pdfmetrics.registerFont(TTFont("NPSerifItalic", str(font_dir / "georgiai.ttf")))
pdfmetrics.registerFont(TTFont("NPSans", str(font_dir / "arial.ttf")))
pdfmetrics.registerFont(TTFont("NPSansBold", str(font_dir / "arialbd.ttf")))

SAND = colors.HexColor("#F4EEE1")
CREAM = colors.HexColor("#FDFAF5")
TERRACOTTA = colors.HexColor("#C1734B")
SAGE = colors.HexColor("#8B9A7C")
BARK = colors.HexColor("#3F352A")
SOFT = colors.HexColor("#6B5D4C")
LINE = colors.HexColor("#E9DFC8")

styles = getSampleStyleSheet()
body = ParagraphStyle(
    "Body", fontName="NPSans", fontSize=9.1, leading=13.4,
    textColor=SOFT, spaceAfter=6.5, allowWidows=0, allowOrphans=0,
)
section = ParagraphStyle(
    "Section", fontName="NPSerif", fontSize=17, leading=21,
    textColor=BARK, spaceBefore=11, spaceAfter=6, keepWithNext=True,
)
intro_head = ParagraphStyle(
    "IntroHead", parent=section, fontSize=20, leading=24, textColor=TERRACOTTA,
)
small_caps = ParagraphStyle(
    "SmallCaps", fontName="NPSansBold", fontSize=7.5, leading=10,
    textColor=SAGE, tracking=1.4, spaceAfter=9, alignment=TA_CENTER,
)
quote = ParagraphStyle(
    "Quote", fontName="NPSerifItalic", fontSize=11, leading=16,
    textColor=BARK, leftIndent=16, rightIndent=16, spaceBefore=7, spaceAfter=7,
)
bullet = ParagraphStyle(
    "Bullet", parent=body, leftIndent=17, firstLineIndent=-10,
    bulletIndent=0, spaceAfter=5,
)
cta = ParagraphStyle(
    "CTA", fontName="NPSerif", fontSize=16, leading=20, textColor=CREAM,
    alignment=TA_CENTER, spaceAfter=5,
)
cta_body = ParagraphStyle(
    "CTABody", fontName="NPSans", fontSize=8.7, leading=12.5,
    textColor=CREAM, alignment=TA_CENTER,
)

SECTIONS = [
    ("The relationship comes before the leash", [
        "People ask me about leash training a lot, and honestly, I do not have a dramatic story for them. It did not feel like a fight because it never really was one. I put the harness on, I had treats ready, and Cheeto decided pretty quickly that the trade was a good deal.",
        "What is easy to overlook is everything that existed before that moment. Cheeto already knew my voice, my routines, and the way I handled him. I had learned the difference between curiosity, hesitation, irritation, and fear in his body language. The harness mattered, but our relationship is a major part of why training works.",
        "Leash training is not only teaching a cat to tolerate equipment. It is building a shared language so your cat can trust you when the world gets bigger. That trust is worth it: the scenery changes, and the bond you share can become deeper too.",
    ]),
    ("1. Build trust before asking for adventure", [
        "Start with ordinary relationship-building at home. Notice how your cat asks for space, affection, play, food, and attention. Practice handling the areas a harness will touch - the chest, shoulders, neck, and belly - without restraining your cat or pushing past discomfort.",
        "Create predictable routines. Use the same calm voice, the same reward word, and the same general order of events. When your cat understands what is happening next, it is easier to earn their trust.",
        "The goal is not blind obedience. The goal is for your cat to learn, \"This person listens to me, and I am safe trying something new with them.\" If you are lucky, they may also ask, \"How do I get this treat?\"",
    ]),
    ("2. Choose secure, comfortable equipment", [
        "Use a well-fitted harness designed for cats and built to reduce the risk of backing out. Check the fit every time before opening a door. Your cat should move and breathe comfortably, but the harness should not be loose enough for a shoulder or leg to slip through.",
        "If you would like a specific place to start, Buddy Armor is one option I feel comfortable recommending. Its harnesses, leashes, and collars are made for cats with safety and secure fit in mind, and I genuinely appreciate that the products are both thoughtful and beautiful. I do not work with Buddy Armor, and this is not a sponsored recommendation.",
        "You do not need this exact brand to begin. The right equipment is whatever fits your individual cat securely and comfortably. If you shop through my Amazon affiliate link, Nomadic Paws may earn a small commission at no additional cost to you. That helps support this site, but it does not change what I recommend.",
        "Attach a lightweight leash indoors first and supervise so it cannot snag on furniture. Outdoor walks should always use a secure harness and leash, even after your cat becomes experienced.",
        "Before outdoor training, make sure identification, microchip information, vaccines, and parasite prevention are appropriate for your cat and location. Your veterinarian can help with individual questions. I also recommend a collar with your contact information and/or tracking capability.",
    ]),
    ("3. Make the harness predict something good", [
        "Let your cat investigate the harness before wearing it. Place it near a favorite resting area or treats so it becomes familiar rather than suddenly appearing as a restraint.",
        "Use a high-value reward when the harness comes out. For Cheeto, treats and the prospect of exploration made the decision simple: harness time meant something good was happening. Affection can help too. Gentle pets can make the harness and leash feel connected to your familiar hands and routine.",
        "Build in small steps. Touch the harness to the body, reward, and stop. Drape it briefly, reward, and stop. Clip one part, reward, and stop. Some cats move through this quickly; others need days or weeks. Both are normal. A reward is whatever matters to your cat - treats, pets, praise, or play.",
    ]),
    ("4. Use calm timing when clipping it on", [
        "The clipping moment is often the hardest part because it requires a cat to stay still. I used a treat to keep Cheeto occupied while I secured the harness around his neck and body. A lickable treat on a plate or mat can create a gentle, low-stress window.",
        "Pets and your voice can be praise too. A consistent marker such as \"yes, this is good\" helps your cat understand the moment you are rewarding.",
        "Do not chase, corner, or wrestle your cat into the harness. If the session becomes a struggle, stop and return to an easier step later. Protecting trust is more valuable than completing the task on a particular day.",
    ]),
    ("5. Practice movement indoors", [
        "Start with very short sessions inside. Let your cat walk, play, eat treats, and move naturally while wearing the harness. Some cats crouch or flop because the sensation is unfamiliar. Give them time rather than pulling them upright. Cheeto sometimes still acts as if he cannot jump in a harness and climbs instead. Patience and a pleasant distraction can help.",
        "Once the harness feels ordinary, add the leash. Follow your cat around the room and keep the line loose. Reward check-ins, voluntary movement toward you, and calm responses to gentle leash pressure. Being attached to you can become a genuine source of safety.",
        "The leash is a safety connection, not a steering wheel. Cats do not usually walk like dogs. You may guide direction and prevent danger, but much of the experience is learning to move together.",
    ]),
    ("6. Make the carrier or backpack a safe base", [
        "For us, the backpack became part of the relationship and the routine. It is transportation, a resting place, and a familiar space when the environment feels too big. Cheeto uses it when we walk along a road, and he watches from inside until a car passes. He knows he is protected there.",
        "Introduce the carrier or backpack at home with the bag open and holding its shape. Use it as a tunnel. Multiple openings made it easier for me to show Cheeto how to enter. Add treats or familiar bedding, keep the experience calm and fun, and practice entering and leaving without immediately ending the session or going somewhere.",
        "Outdoors, your cat should have a reliable place to retreat. A safe base makes exploration feel like a choice. Listen when your cat asks to come out or go back in; those cues are part of the language you are building together.",
    ]),
    ("7. Practice recall before outdoor experiences", [
        "Practice recall indoors before beginning outdoor experiences. It creates a familiar way for your cat to check in, respond when the environment becomes overwhelming, and move toward a safe place such as a carrier or backpack. Practice across different rooms and distraction levels with one consistent cue and a reward that matters to your cat.",
        "My cue is \"kitty\" because it works naturally for us. Yours can be any short, consistent word. Begin where getting your cat's attention is easy. Then practice with the harness and leash attached, using a loose line and gentle guidance rather than pulling.",
        "Recall never replaces identification, a secure harness and leash, a carrier, closed-door habits, or careful supervision outdoors. Even a cat with excellent recall can bolt when frightened or overwhelmed.",
        "For Cheeto, recall helps us communicate during leashed adventures and can redirect him toward me or his backpack. It has also been a blessing on rare occasions when he slipped through a door. That emergency protection matters, but it is an additional layer of safety - not permission to rely on recall alone outdoors.",
    ]),
    ("8. Take the first outdoor steps slowly", [
        "Choose a quiet, controlled place rather than a busy trail. A porch, enclosed yard, or calm area near home can be enough. Bring the backpack - it is their den away from home. Keep the first session short and let your cat observe. They may lie down and watch, want to explore everything, or ask to go inside. All are normal responses.",
        "Watch the whole cat: ears, tail, posture, breathing, eyes, and willingness to take treats. Curiosity can include caution. Fear looks more like freezing, frantic escape attempts, flattened ears, panting, or an inability to settle. When your cat says the environment is too much, listen. If you are unsure, video can help a knowledgeable person interpret what your cat is expressing.",
    ]),
    ("9. Build duration and difficulty gradually", [
        "Repeat familiar places before adding distance, noise, dogs, vehicles, weather, or unfamiliar terrain. Increase one kind of difficulty at a time when possible. Teaching a cat to feel safe in the car can also help; that is a future free guide I am developing as Cheeto learns that car rides can lead to new adventures.",
        "End sessions while your cat is still coping well. Coming home calmly is better than staying out until both of you are exhausted. Consistency matters more than speed, and progress is not always linear.",
        "Cheeto can handle experiences now that would have been too much at the beginning. That confidence came from many ordinary repetitions, not one perfect training session. Any pace, and every tiny bit of progress, can become part of a beautiful result.",
    ]),
    ("10. Let your cat's signals shape the plan", [
        "Relationship-based training means your cat gets a voice in the process. That does not mean the cat makes every safety decision. It means you practice awareness, notice what they communicate, and adjust before fear becomes panic. Video can help you reflect or ask someone experienced for guidance.",
        "If your cat lies down, refuses to move, hides, pulls toward the carrier, stops accepting treats, or becomes unusually alert, pause and reassess. Sometimes the answer is more time, a different route, or going home. Choose what keeps your cat safe.",
        "Cheeto once feared flags flapping in the wind. I knew they could not hurt him; he did not. We stayed far enough away for him to notice without becoming distressed, then worked closer as his attention to me began to outweigh his fear.",
        "Leading is not forcing the next step. Sometimes it is seeing farther ahead while still respecting the animal in front of you.",
    ]),
]

QUICK_START = [
    "Spend a week noticing and rewarding calm check-ins at home.",
    "Let the harness become familiar before putting it on.",
    "Practice brief handling around the chest, shoulders, neck, and belly.",
    "Use high-value rewards and end before frustration begins.",
    "Build short indoor harness sessions.",
    "Add the leash indoors and follow with a loose line.",
    "Practice recall indoors as communication and emergency backup - never as a replacement for physical safety.",
    "Make the carrier or backpack a positive safe base.",
    "Choose a quiet location for the first outdoor session.",
    "Keep the first adventure short, even if it goes beautifully.",
    "Let your cat's body language decide how quickly you progress.",
]


class NumberedDocTemplate(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(
            filename, pagesize=letter, leftMargin=.72 * inch, rightMargin=.72 * inch,
            topMargin=.72 * inch, bottomMargin=.62 * inch, title="How to Leash Train Your Cat",
            author="Nomadic Paws",
        )
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="body")
        self.addPageTemplates([
            PageTemplate(id="cover", frames=frame, onPage=self.cover_page),
            PageTemplate(id="content", frames=frame, onPage=self.content_page),
        ])

    def cover_page(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(CREAM)
        canvas.rect(0, 0, letter[0], letter[1], fill=1, stroke=0)
        canvas.setFillColor(SAGE)
        canvas.rect(0, letter[1] - .16 * inch, letter[0], .16 * inch, fill=1, stroke=0)
        canvas.setFillColor(TERRACOTTA)
        canvas.rect(0, 0, letter[0], .13 * inch, fill=1, stroke=0)
        canvas.setFont("NPSans", 7.5)
        canvas.setFillColor(SOFT)
        canvas.drawCentredString(
            letter[0] / 2, .32 * inch,
            "hello@nomadicpaws.co   |   nomadicpaws.co   |   @nomadicpawstv"
        )
        canvas.restoreState()

    def content_page(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(CREAM)
        canvas.rect(0, 0, letter[0], letter[1], fill=1, stroke=0)
        canvas.setStrokeColor(LINE)
        canvas.line(.72 * inch, letter[1] - .49 * inch, letter[0] - .72 * inch, letter[1] - .49 * inch)
        canvas.setFont("NPSansBold", 7)
        canvas.setFillColor(SAGE)
        canvas.drawString(.72 * inch, letter[1] - .38 * inch, "NOMADIC PAWS  |  TRUST BEFORE TRAILS")
        canvas.setStrokeColor(LINE)
        canvas.line(.72 * inch, .5 * inch, letter[0] - .72 * inch, .5 * inch)
        canvas.setFont("NPSans", 7.2)
        canvas.setFillColor(SOFT)
        canvas.drawCentredString(
            letter[0] / 2, .3 * inch,
            "hello@nomadicpaws.co   |   nomadicpaws.co   |   @nomadicpawstv"
        )
        canvas.drawRightString(letter[0] - .72 * inch, .3 * inch, f"{doc.page}")
        canvas.restoreState()


story = [Spacer(1, .3 * inch)]
story.append(Image(str(LOGO), width=1.42 * inch, height=1.42 * inch))
story.append(Spacer(1, .28 * inch))
story.append(Paragraph("A FREE NOMADIC PAWS GUIDE", small_caps))
story.append(Paragraph(
    "How to Leash Train<br/>Your Cat",
    ParagraphStyle("CoverTitle", fontName="NPSerif", fontSize=34, leading=38, textColor=BARK, alignment=TA_CENTER)
))
story.append(Spacer(1, .13 * inch))
story.append(Paragraph(
    "<i>The relationship comes before the leash.</i>",
    ParagraphStyle("CoverSub", fontName="NPSerifItalic", fontSize=16, leading=20, textColor=TERRACOTTA, alignment=TA_CENTER)
))
story.append(Spacer(1, .32 * inch))
story.append(Paragraph(
    "A relationship-first path from indoor trust to safer outdoor adventures - built from what Cheeto and I learned together.",
    ParagraphStyle("CoverBody", fontName="NPSans", fontSize=10.5, leading=16, textColor=SOFT, alignment=TA_CENTER, leftIndent=.55*inch, rightIndent=.55*inch)
))
story.append(Spacer(1, .42 * inch))
story.append(Paragraph("WRITTEN BY NOMADIC PAWS", small_caps))
story.append(NextPageTemplate("content"))
story.append(PageBreak())

for index, (heading, paragraphs) in enumerate(SECTIONS):
    head_style = intro_head if index == 0 else section
    story.append(Paragraph(heading, head_style))
    for paragraph in paragraphs:
        story.append(Paragraph(paragraph, body))

story.append(Paragraph("A simple place to start", section))
quick_style = ParagraphStyle(
    "Quick", parent=body, fontSize=8.2, leading=11.2,
    leftIndent=10, firstLineIndent=-7, spaceAfter=0,
)
quick_items = [Paragraph(item, quick_style, bulletText="•") for item in QUICK_START]
quick_rows = []
half = (len(quick_items) + 1) // 2
for row in range(half):
    left = quick_items[row]
    right = quick_items[row + half] if row + half < len(quick_items) else ""
    quick_rows.append([left, right])
story.append(Table(
    quick_rows,
    colWidths=[2.95 * inch, 2.95 * inch],
    hAlign="LEFT",
    style=TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]),
))

story.append(Paragraph("Trust over tricks", section))
story.append(Paragraph(
    "Some skills come quickly and others require daily conditioning well beyond thirty days. The real order of operations is not recall, harness, leash, trail. It is relationship, trust, communication, equipment, practice, and then adventure.",
    body,
))
story.append(Paragraph(
    "Over time, treats may become less important because the routine itself becomes rewarding. Your bond and the familiar order of the hike begin doing work that food did at the beginning. That relationship is the foundation under every visible training step.",
    body,
))
story.append(Paragraph(
    "\"Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.\"<br/><b>- Galatians 6:9</b>",
    quote,
))
story.append(Paragraph(
    "Lord, thank You for the patient, unglamorous parts of building trust - with Cheeto, and in every other place You are growing something in me too. Help me listen well, lead with care, and honor the small steps that become something beautiful over time. Amen.",
    body,
))

story.append(Paragraph("A note about your cat", section))
story.append(Paragraph(
    "I have made an effort to generalize this advice so it can help more people, but this guide began with one relationship: mine and Cheeto's. What works for us may look different from what works for you and your cat. Your cat may need more time, different rewards, fewer steps in one session, or a completely different kind of adventure. That is okay. Take video when your cat displays unfamiliar behavior so others can help you on your journey. No house is built alone.",
    body,
))
story.append(Paragraph(
    "Progress is not measured by how closely your cat becomes Cheeto. It is measured by whether you and your cat are building trust, communicating more clearly, and finding a routine that feels safe for both of you.",
    body,
))

story.append(Spacer(1, .15 * inch))
cta_box = [
    Paragraph("Come back when you are ready", cta),
    Paragraph(
        "You do not need to buy everything or turn your cat into an adventure cat overnight. Start with the relationship in front of you and the resources you already have.<br/><br/>Whenever you are ready for another step, the Trail Journal, practical checklist, and future guides will be waiting at <link href='https://nomadicpaws.co' color='#FDFAF5'><u>nomadicpaws.co</u></link>.",
        cta_body,
    ),
]
box = Table([[cta_box]], colWidths=[6.0 * inch], style=[
    ("BACKGROUND", (0, 0), (-1, -1), BARK),
    ("BOX", (0, 0), (-1, -1), 0, BARK),
    ("LEFTPADDING", (0, 0), (-1, -1), 28),
    ("RIGHTPADDING", (0, 0), (-1, -1), 28),
    ("TOPPADDING", (0, 0), (-1, -1), 16),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
])
story.append(KeepTogether(box))

doc = NumberedDocTemplate(str(OUT))
doc.build(story)
print(OUT)
