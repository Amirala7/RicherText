// Clipboard HTML as each app puts it on the clipboard (text/html), trimmed to
// the same short sample: a heading, a line with every mark and a link, a
// bulleted list with one nested item, a numbered list and (where the app has
// one) a quote. Shapes follow what these apps write in Chrome on macOS and
// Windows; long style attributes are shortened but keep the parts that matter.

const docsSpan = (style: string, text: string) =>
  `<span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-variant:normal;vertical-align:baseline;white-space:pre;white-space:pre-wrap;${style}">${text}</span>`;
const plain = "font-weight:400;font-style:normal;text-decoration:none;";
const docsItem = (level: number, text: string) =>
  `<li dir="ltr" style="list-style-type:${level === 1 ? "disc" : "circle"};font-size:11pt;font-family:Arial,sans-serif;" aria-level="${level}"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation">${docsSpan(plain, text)}</p></li>`;

// Google Docs: everything inside <b style="font-weight:normal">, marks as
// inline styles, links underlined by a span, nested lists as a <ul> directly
// inside the <ul> (not inside the <li>).
export const googleDocs =
  `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1a2b3c4d-7fff-0b1c-2d3e-4f5a6b7c8d9e">` +
  `<h1 dir="ltr" style="line-height:1.38;margin-top:20pt;margin-bottom:6pt;"><span style="font-size:20pt;font-family:Arial,sans-serif;color:#000000;font-weight:400;font-style:normal;text-decoration:none;">Q4 plan</span></h1>` +
  `<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;">` +
  docsSpan(plain, "Plain, ") +
  docsSpan("font-weight:700;font-style:normal;text-decoration:none;", "bold") +
  docsSpan(plain, ", ") +
  docsSpan(
    "font-weight:400;font-style:italic;text-decoration:none;",
    "italic",
  ) +
  docsSpan(plain, ", ") +
  docsSpan(
    "font-weight:400;font-style:normal;text-decoration:underline;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;",
    "underlined",
  ) +
  docsSpan(plain, ", ") +
  docsSpan(
    "font-weight:400;font-style:normal;text-decoration:line-through;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;",
    "struck",
  ) +
  docsSpan(plain, " and ") +
  `<a href="https://example.com/" style="text-decoration:none;">` +
  docsSpan(
    "color:#1155cc;font-weight:400;font-style:normal;text-decoration:underline;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;",
    "a link",
  ) +
  `</a>` +
  docsSpan(plain, ".") +
  `</p>` +
  `<ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;">` +
  docsItem(1, "First") +
  `<ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;">` +
  docsItem(2, "Nested") +
  `</ul>` +
  docsItem(1, "Second") +
  `</ul>` +
  `<ol style="margin-top:0;margin-bottom:0;padding-inline-start:48px;">` +
  docsItem(1, "One").replace("disc", "decimal") +
  docsItem(1, "Two").replace("disc", "decimal") +
  `</ol></b><br class="Apple-interchange-newline">`;

const wordIgnore = (marker: string) =>
  `<![if !supportLists]><span style='font-family:Symbol;mso-fareast-font-family:Symbol'><span style='mso-list:Ignore'>${marker}<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>`;
const wordItem = (
  cls: string,
  list: string,
  level: number,
  marker: string,
  text: string,
) =>
  `<p class=MsoListParagraph${cls} style='margin-left:${36 * level}.0pt;mso-add-space:auto;text-indent:-18.0pt;mso-list:${list} level${level} lfo${list === "l0" ? 1 : 2}'>${wordIgnore(marker)}<span lang=EN-GB>${text}<o:p></o:p></span></p>`;

// Word for Windows / Mac, and Outlook for Windows (it writes with Word): a
// whole HTML document; lists are paragraphs with mso-list styles and the
// bullet or number as text in an mso-list:Ignore span; quotes are MsoQuote.
export const word =
  `<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
  `<head><meta http-equiv=Content-Type content="text/html; charset=utf-8"><meta name=ProgId content=Word.Document><meta name=Generator content="Microsoft Word 15">` +
  `<style><!-- p.MsoNormal, li.MsoNormal, div.MsoNormal {margin:0cm; font-size:12.0pt; font-family:"Aptos",sans-serif;} @list l0:level1 {mso-level-number-format:bullet;} --></style></head>` +
  `<body lang=EN-GB style='tab-interval:36.0pt;word-wrap:break-word'><!--StartFragment-->` +
  `<h1><span lang=EN-GB>Q4 plan<o:p></o:p></span></h1>` +
  `<p class=MsoNormal><span lang=EN-GB>Plain, <b>bold</b>, <i>italic</i>, <u>underlined</u>, <s>struck</s> and <a href="https://example.com/">a link</a>.<o:p></o:p></span></p>` +
  wordItem("CxSpFirst", "l0", 1, "·", "First") +
  wordItem(
    "CxSpMiddle",
    "l0",
    2,
    `<span style='font-family:"Courier New"'>o</span>`,
    "Nested",
  ) +
  wordItem("CxSpLast", "l0", 1, "·", "Second") +
  wordItem("CxSpFirst", "l1", 1, "1.", "One") +
  wordItem("CxSpLast", "l1", 1, "2.", "Two") +
  `<p class=MsoQuote><span lang=EN-GB>Quoted<o:p></o:p></span></p>` +
  `<!--EndFragment--></body></html>`;

// Gmail (reading or writing): lines are <div>s, empty lines <div><br></div>,
// strikethrough is <strike>, quotes are blockquote.gmail_quote.
export const gmail =
  `<div dir="ltr"><div>Q4 plan</div><div><br></div>` +
  `<div>Plain, <b>bold</b>, <i>italic</i>, <u>underlined</u>, <strike>struck</strike> and <a href="https://example.com/">a link</a>.</div><div><br></div>` +
  `<ul><li>First</li><ul><li>Nested</li></ul><li>Second</li></ul>` +
  `<ol><li>One</li><li>Two</li></ol>` +
  `<blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">Quoted</blockquote></div>`;

const outlookStyle =
  'style="font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, Calibri, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);"';

// Outlook on the web and the new Outlook: lines are div.elementToProof with
// font styles, lists are plain ul/ol, quotes are blockquote.
export const outlookWeb =
  `<div class="elementToProof" ${outlookStyle}>Q4 plan</div>` +
  `<div class="elementToProof" ${outlookStyle}>Plain, <b>bold</b>, <i>italic</i>, <u>underlined</u>, <s>struck</s> and <a href="https://example.com/" id="LPlnk123456">a link</a>.</div>` +
  `<ul data-editing-info="{&quot;applyListStyleFromLevel&quot;:false}" style="margin-top: 0px; margin-bottom: 0px;"><li ${outlookStyle}><div role="presentation" class="elementToProof">First</div></li>` +
  `<ul style="margin-top: 0px; margin-bottom: 0px;"><li ${outlookStyle}><div role="presentation" class="elementToProof">Nested</div></li></ul>` +
  `<li ${outlookStyle}><div role="presentation" class="elementToProof">Second</div></li></ul>` +
  `<ol style="margin-top: 0px; margin-bottom: 0px;"><li ${outlookStyle}><div role="presentation" class="elementToProof">One</div></li><li ${outlookStyle}><div role="presentation" class="elementToProof">Two</div></li></ol>` +
  `<blockquote style="margin-left: 0.8ex; padding-left: 1ex; border-left: 3px solid rgb(200, 200, 200);"><div class="elementToProof" ${outlookStyle}>Quoted</div></blockquote>`;
