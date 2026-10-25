import zlib from "zlib";
import type { ExportReportData } from "./exportProjectReport.action";

// ── Static XML assets extracted verbatim from the official MCIT QA Excel template ──

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet5.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/><Override PartName="/xl/charts/style1.xml" ContentType="application/vnd.ms-office.chartstyle+xml"/><Override PartName="/xl/charts/colors1.xml" ContentType="application/vnd.ms-office.chartcolorstyle+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet5.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/></Relationships>`;

const SHEET4_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`;

const DRAWING1_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/></Relationships>`;

const CHART1_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.microsoft.com/office/2011/relationships/chartColorStyle" Target="colors1.xml"/><Relationship Id="rId1" Type="http://schemas.microsoft.com/office/2011/relationships/chartStyle" Target="style1.xml"/></Relationships>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac x16r2 xr" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:x16r2="http://schemas.microsoft.com/office/spreadsheetml/2015/02/main" xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision"><fonts count="4" x14ac:knownFonts="1"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/><family val="2"/></font><font><sz val="14"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="13"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1" readingOrder="2"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" readingOrder="2"/></xf><xf numFmtId="14" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" readingOrder="2"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;

const THEME1_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F497D"/></a:dk2><a:lt2><a:srgbClr val="EEECE1"/></a:lt2><a:accent1><a:srgbClr val="4F81BD"/></a:accent1><a:accent2><a:srgbClr val="C0504D"/></a:accent2><a:accent3><a:srgbClr val="9BBB59"/></a:accent3><a:accent4><a:srgbClr val="8064A2"/></a:accent4><a:accent5><a:srgbClr val="4BACC6"/></a:accent5><a:accent6><a:srgbClr val="F79646"/></a:accent6><a:hlink><a:srgbClr val="0000FF"/></a:hlink><a:folHlink><a:srgbClr val="800080"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Cambria"/><a:ea typeface=""/><a:cs typeface=""/><a:font script="Arab" typeface="Times New Roman"/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/><a:font script="Arab" typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/><a:satMod val="300000"/></a:schemeClr></a:gs><a:gs pos="35000"><a:schemeClr val="phClr"><a:tint val="37000"/><a:satMod val="300000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:tint val="15000"/><a:satMod val="350000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="1"/></a:gradFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:shade val="51000"/><a:satMod val="130000"/></a:schemeClr></a:gs><a:gs pos="80000"><a:schemeClr val="phClr"><a:shade val="93000"/><a:satMod val="130000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="94000"/><a:satMod val="135000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="0"/></a:gradFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"><a:shade val="95000"/><a:satMod val="105000"/></a:schemeClr></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="25400" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="40000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="20000"/></a:schemeClr></a:gs></a:gsLst><a:path path="circle"><a:fillToRect l="50000" t="-80000" r="50000" b="180000"/></a:path></a:gradFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="80000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="30000"/></a:schemeClr></a:gs></a:gsLst><a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path></a:gradFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;

const DRAWING1_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:oneCellAnchor><xdr:from><xdr:col>4</xdr:col><xdr:colOff>83820</xdr:colOff><xdr:row>3</xdr:row><xdr:rowOff>152400</xdr:rowOff></xdr:from><xdr:ext cx="5400000" cy="2997180"/><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Chart 1"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`;

const CHART_STYLE1_XML = `<cs:chartStyle xmlns:cs="http://schemas.microsoft.com/office/drawing/2012/chartStyle" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" id="205"><cs:chartArea><cs:lnRef idx="0"/><cs:fillRef idx="0"/><cs:effectRef idx="0"/><cs:fontRef idx="minor"><a:schemeClr val="dk1"/></cs:fontRef><cs:defRPr sz="900" kern="1200"/></cs:chartArea><cs:plotArea><cs:lnRef idx="0"/><cs:fillRef idx="0"/><cs:effectRef idx="0"/><cs:fontRef idx="minor"><a:schemeClr val="dk1"/></cs:fontRef></cs:plotArea></cs:chartStyle>`;

const CHART_COLORS1_XML = `<cs:colorStyle xmlns:cs="http://schemas.microsoft.com/office/drawing/2012/chartStyle" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" meth="cycle" id="10"><a:schemeClr val="accent1"/><a:schemeClr val="accent2"/><a:schemeClr val="accent3"/><a:schemeClr val="accent4"/><a:schemeClr val="accent5"/><a:schemeClr val="accent6"/></cs:colorStyle>`;

const APP_PROPS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Excel</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>5</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="5" baseType="lpstr"><vt:lpstr>Test Cases</vt:lpstr><vt:lpstr>Defect Log</vt:lpstr><vt:lpstr>Execution Summary</vt:lpstr><vt:lpstr>Dashboard</vt:lpstr><vt:lpstr>Test Environment</vt:lpstr></vt:vector></TitlesOfParts><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0300</AppVersion></Properties>`;

function buildChart1Xml(passed: number, failed: number, blocked: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:date1904 val="0"/><c:lang val="en-US"/><c:roundedCorners val="1"/><c:style val="2"/><c:chart><c:title><c:tx><c:rich><a:bodyPr rot="0" spcFirstLastPara="1" vertOverflow="ellipsis" vert="horz" wrap="square" anchor="ctr" anchorCtr="1"/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1800" b="1" i="0" u="none" strike="noStrike" kern="1200" baseline="0"><a:solidFill><a:schemeClr val="dk1"><a:lumMod val="75000"/><a:lumOff val="25000"/></a:schemeClr></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:pPr><a:r><a:rPr lang="en-US"/><a:t>Test Execution Status</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln><a:effectLst/></c:spPr></c:title><c:autoTitleDeleted val="0"/><c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="1"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:strRef><c:f>Dashboard!$B$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Count</c:v></c:pt></c:strCache></c:strRef></c:tx><c:invertIfNegative val="1"/><c:dPt><c:idx val="0"/><c:invertIfNegative val="1"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:schemeClr val="accent3"><a:alpha val="85000"/></a:schemeClr></a:solidFill></c:spPr></c:dPt><c:dPt><c:idx val="1"/><c:invertIfNegative val="1"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:schemeClr val="accent2"><a:alpha val="85000"/></a:schemeClr></a:solidFill></c:spPr></c:dPt><c:dPt><c:idx val="2"/><c:invertIfNegative val="1"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:schemeClr val="accent1"><a:alpha val="85000"/></a:schemeClr></a:solidFill></c:spPr></c:dPt><c:dLbls><c:dLblPos val="outEnd"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls><c:cat><c:strRef><c:f>Dashboard!$A$2:$A$4</c:f><c:strCache><c:ptCount val="3"/><c:pt idx="0"><c:v>Passed</c:v></c:pt><c:pt idx="1"><c:v>Failed</c:v></c:pt><c:pt idx="2"><c:v>Blocked</c:v></c:pt></c:strCache></c:strRef></c:cat><c:val><c:numRef><c:f>Dashboard!$B$2:$B$4</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="3"/><c:pt idx="0"><c:v>${passed}</c:v></c:pt><c:pt idx="1"><c:v>${failed}</c:v></c:pt><c:pt idx="2"><c:v>${blocked}</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser><c:gapWidth val="65"/><c:axId val="10"/><c:axId val="100"/></c:barChart><c:catAx><c:axId val="10"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="100"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx><c:valAx><c:axId val="100"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="10"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln><a:effectLst/></c:spPr></c:plotArea><c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr><a:gradFill flip="none" rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="lt1"/></a:gs><a:gs pos="39000"><a:schemeClr val="lt1"/></a:gs><a:gs pos="100000"><a:schemeClr val="lt1"><a:lumMod val="75000"/></a:schemeClr></a:gs></a:gsLst><a:path path="circle"><a:fillToRect l="50000" t="-80000" r="50000" b="180000"/></a:path><a:tileRect/></a:gradFill><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="dk1"><a:lumMod val="25000"/><a:lumOff val="75000"/></a:schemeClr></a:solidFill><a:round/></a:ln></c:spPr></c:chartSpace>`;
}

// ── XML & SharedStrings Helpers ──────────────────────────────────────────────

function escapeXml(raw: string): string {
  // Strip illegal XML 1.0 control characters (keep \t \n \r)
  const cleaned = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  return cleaned
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

class SharedStringsTable {
  private map = new Map<string, number>();
  private list: string[] = [];
  public totalRefs = 0;

  add(val: string): number {
    this.totalRefs++;
    const existing = this.map.get(val);
    if (existing !== undefined) return existing;
    const idx = this.list.length;
    this.list.push(val);
    this.map.set(val, idx);
    return idx;
  }

  toXml(): string {
    const items = this.list
      .map((s) => {
        const preserve =
          s.startsWith(" ") ||
          s.endsWith(" ") ||
          s.includes("\n") ||
          s.includes("\r") ||
          s.includes("\t");
        return `<si><t${preserve ? ' xml:space="preserve"' : ""}>${escapeXml(s)}</t></si>`;
      })
      .join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${this.totalRefs}" uniqueCount="${this.list.length}">${items}</sst>`;
  }
}

const COL_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

function strCell(colIdx: number, rowNum: number, styleIdx: number, text: string | null | undefined, sst: SharedStringsTable): string {
  const ref = `${COL_LETTERS[colIdx]}${rowNum}`;
  if (text === null || text === undefined || text === "") {
    return `<c r="${ref}" s="${styleIdx}"/>`;
  }
  const idx = sst.add(text);
  return `<c r="${ref}" s="${styleIdx}" t="s"><v>${idx}</v></c>`;
}

function numCell(colIdx: number, rowNum: number, styleIdx: number, val: number): string {
  const ref = `${COL_LETTERS[colIdx]}${rowNum}`;
  return `<c r="${ref}" s="${styleIdx}"><v>${val}</v></c>`;
}

function formatSteps(steps: any): string {
  if (!steps) return "";
  let arr: string[] | null = null;
  if (Array.isArray(steps)) {
    arr = steps.map((s) => String(s ?? ""));
  } else if (typeof steps === "string") {
    try {
      const parsed = JSON.parse(steps);
      if (Array.isArray(parsed)) {
        arr = parsed.map((s) => String(s ?? ""));
      }
    } catch {
      // plain string
    }
    if (!arr) {
      return steps.replace(/\r?\n/g, "\r\n").trim();
    }
  } else {
    return String(steps);
  }

  return arr
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, idx) => (/^\d+[\.\-\)]/.test(s) ? s : `${idx + 1}. ${s}`))
    .join("\r\n");
}

function getLocalWallClock(dateStr: string | null | undefined, tzOffsetMinutes: number) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const shifted = new Date(d.getTime() - tzOffsetMinutes * 60_000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const hours24 = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes();
  const seconds = shifted.getUTCSeconds();

  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  const pad2 = (n: number) => String(n).padStart(2, "0");

  return {
    dayKey: `${year}-${pad2(month)}-${pad2(day)}`,
    formattedExecDate: `${month}/${day}/${year}, ${hours12}:${pad2(minutes)}:${pad2(seconds)} ${ampm}`,
    excelDateSerial: Math.floor(Date.UTC(year, month - 1, day) / 86_400_000) + 25569,
  };
}

function normalizeSeverity(val?: string | null): "Critical" | "High" | "Medium" | "Low" {
  const s = (val || "").toLowerCase().trim();
  if (s === "critical") return "Critical";
  if (s === "high") return "High";
  if (s === "medium") return "Medium";
  if (s === "low") return "Low";
  return "High";
}

function normalizePriority(val?: string | null): "High" | "Medium" | "Low" {
  const s = (val || "").toLowerCase().trim();
  if (s === "critical" || s === "high") return "High";
  if (s === "medium") return "Medium";
  if (s === "low") return "Low";
  return "High";
}

function estimateRowHeight(texts: string[], minHeight = 43.2): number {
  let maxLines = 1;
  texts.forEach((t, i) => {
    if (!t) return;
    const widthChars = i === 4 ? 26 : i === 2 ? 36 : 30;
    const explicitLines = t.split(/\r?\n/);
    let lines = 0;
    for (const line of explicitLines) {
      lines += Math.max(1, Math.ceil(line.length / widthChars));
    }
    if (lines > maxLines) maxLines = lines;
  });
  return Math.max(minHeight, Math.min(220, Math.round(maxLines * 16.5 * 10) / 10));
}

// ── Minimal Standard ZIP Writer (Deflate + CRC32) ────────────────────────────

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZipBuffer(files: Array<{ name: string; content: string | Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, "utf8");
    const rawBuf = typeof file.content === "string" ? Buffer.from(file.content, "utf8") : file.content;
    const compBuf = zlib.deflateRawSync(rawBuf, { level: 6 });
    const crc = crc32(rawBuf);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 flag
    localHeader.writeUInt16LE(8, 8); // method: deflate
    localHeader.writeUInt16LE(0x5800, 10); // mod time
    localHeader.writeUInt16LE(0x5559, 12); // mod date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compBuf.length, 18);
    localHeader.writeUInt32LE(rawBuf.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra len

    localParts.push(localHeader, nameBuf, compBuf);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 flag
    centralHeader.writeUInt16LE(8, 10); // method: deflate
    centralHeader.writeUInt16LE(0x5800, 12);
    centralHeader.writeUInt16LE(0x5559, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compBuf.length, 20);
    centralHeader.writeUInt32LE(rawBuf.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += 30 + nameBuf.length + compBuf.length;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirBuf, eocd]);
}

// ── Main Workbook Builder ────────────────────────────────────────────────────

export function buildOfficialQaXlsxBuffer(
  reportData: ExportReportData,
  tzOffsetMinutes = -180
): {
  buffer: Buffer;
  totalCount: number;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  bugsCount: number;
} {
  const sst = new SharedStringsTable();
  const testCases = reportData.testCases || [];

  let passedCount = 0;
  let failedCount = 0;
  let blockedCount = 0;
  let bugCounter = 1;

  interface BugRow {
    defectId: string;
    title: string;
    module: string;
    description: string;
    severity: string;
    priority: string;
    status: string;
    reportedBy: string;
    assignedTo: string;
    excelDateSerial: number;
    comments: string;
  }
  const bugs: BugRow[] = [];

  // ── Sheet 1: Test Cases ────────────────────────────────────────────────────
  const tcHeaders = [
    "Test Case ID",
    "Module",
    "Test Scenario",
    "Pre-Conditions",
    "Test Steps",
    "Expected Result",
    "Actual Result",
    "Status",
    "Defect ID",
    "Tester",
    "Execution Date",
  ];

  const tcSheetRowsXml: string[] = [];

  // Header row (r=1)
  const tcHeaderCells = tcHeaders
    .map((h, colIdx) => strCell(colIdx, 1, colIdx === 4 || colIdx === 5 ? 12 : 8, h, sst))
    .join("");
  tcSheetRowsXml.push(`<row r="1" spans="1:11" ht="22.8" customHeight="1">${tcHeaderCells}</row>`);

  // Data rows (r=2..N+1)
  testCases.forEach((tc, idx) => {
    const rowNum = idx + 2;
    const rawStatus = (tc.status || "").toLowerCase().trim();
    const isBugId = Boolean(tc.testId && /^BUG[-_]/i.test(tc.testId));
    const isFail = rawStatus === "failed" || rawStatus === "fail" || isBugId;
    const isPass = !isFail && (rawStatus === "passed" || rawStatus === "pass");

    let statusLabel: "Pass" | "Fail" | "Blocked";
    if (isFail) {
      statusLabel = "Fail";
      failedCount++;
    } else if (isPass) {
      statusLabel = "Pass";
      passedCount++;
    } else {
      statusLabel = "Blocked";
      blockedCount++;
    }

    const tcDisplayId = `TC_${String(idx + 1).padStart(3, "0")}`;
    const moduleVal =
      (tc.pageName && tc.pageName.trim()) ||
      (tc.module && tc.module.trim()) ||
      reportData.projectApp ||
      reportData.projectName ||
      "General";

    const scenarioVal = (tc.scenario || "").replace(/\t+/g, "").trim();
    const preCondVal = (tc.preConditions || "").trim();
    const stepsVal = formatSteps(tc.steps);
    const expectedVal = (tc.expectedResult || "").trim();
    const actualVal = (tc.actualResult || "").trim();
    const testerVal = (tc.testerName || "Hassan Ali").trim();
    const wall = getLocalWallClock(tc.executedAt || tc.createdAt, tzOffsetMinutes);
    const execDateVal = wall ? wall.formattedExecDate : "";

    let defectId: string | null = null;
    if (isFail) {
      defectId = `BUG_${String(bugCounter).padStart(3, "0")}`;
      bugCounter++;

      const firstScenarioLine = scenarioVal.split(/\r?\n/)[0]?.trim() || "";
      const bugTitle =
        actualVal && actualVal.length <= 65
          ? actualVal
          : firstScenarioLine.length <= 65 && firstScenarioLine.length > 0
          ? firstScenarioLine
          : firstScenarioLine.slice(0, 62) + (firstScenarioLine.length > 62 ? "..." : "") || moduleVal;

      const bugDesc =
        scenarioVal && actualVal && bugTitle !== actualVal
          ? `${scenarioVal}\r\n(${actualVal})`
          : scenarioVal || actualVal || bugTitle;

      bugs.push({
        defectId,
        title: bugTitle,
        module: moduleVal,
        description: bugDesc,
        severity: normalizeSeverity(tc.severity),
        priority: normalizePriority(tc.priority),
        status: "Open",
        reportedBy: testerVal,
        assignedTo:
          reportData.assignedTo && reportData.assignedTo !== testerVal
            ? reportData.assignedTo
            : reportData.assignedTo || "",
        excelDateSerial: wall ? wall.excelDateSerial : Math.floor(Date.now() / 86_400_000) + 25569,
        comments: (tc.notes || "").trim(),
      });
    }

    const rowHeight = estimateRowHeight([
      tcDisplayId,
      moduleVal,
      scenarioVal,
      preCondVal,
      stepsVal,
      expectedVal,
      actualVal,
    ]);

    const cells = [
      strCell(0, rowNum, 3, tcDisplayId, sst),
      strCell(1, rowNum, 3, moduleVal, sst),
      strCell(2, rowNum, 3, scenarioVal, sst),
      strCell(3, rowNum, 3, preCondVal, sst),
      strCell(4, rowNum, 4, stepsVal, sst), // s=4 has RTL readingOrder=2
      strCell(5, rowNum, 3, expectedVal, sst),
      strCell(6, rowNum, 3, actualVal, sst),
      strCell(7, rowNum, 3, statusLabel, sst),
      strCell(8, rowNum, 3, defectId, sst),
      strCell(9, rowNum, 3, testerVal, sst),
      strCell(10, rowNum, 3, execDateVal, sst),
    ].join("");

    tcSheetRowsXml.push(`<row r="${rowNum}" spans="1:11" ht="${rowHeight}" customHeight="1">${cells}</row>`);
  });

  const lastTcRow = Math.max(1, testCases.length + 1);
  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:K${lastTcRow}"/><sheetViews><sheetView tabSelected="1" workbookViewId="0"><selection activeCell="A2" sqref="A2"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="14.4"/><cols><col min="1" max="2" width="22" style="2" customWidth="1"/><col min="3" max="3" width="33" style="2" customWidth="1"/><col min="4" max="4" width="24.5546875" style="2" customWidth="1"/><col min="5" max="5" width="22" style="5" customWidth="1"/><col min="6" max="6" width="27.88671875" style="5" customWidth="1"/><col min="7" max="7" width="29.77734375" style="2" customWidth="1"/><col min="8" max="11" width="22" style="2" customWidth="1"/></cols><sheetData>${tcSheetRowsXml.join("")}</sheetData><autoFilter ref="A1:K${lastTcRow}"/><pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/></worksheet>`;

  // ── Sheet 2: Defect Log (Bugs Tab) ─────────────────────────────────────────
  const bugHeaders = [
    "Defect ID",
    "Title",
    "Module",
    "Description",
    "Severity",
    "Priority",
    "Status",
    "Reported By",
    "Assigned To",
    "Date Reported",
    "Resolution Date",
    "Comments",
  ];

  const bugSheetRowsXml: string[] = [];
  const bugHeaderCells = bugHeaders.map((h, colIdx) => strCell(colIdx, 1, 8, h, sst)).join("");
  bugSheetRowsXml.push(`<row r="1" spans="1:12" ht="24.6" customHeight="1">${bugHeaderCells}</row>`);

  bugs.forEach((b, idx) => {
    const rowNum = idx + 2;
    const ht = estimateRowHeight([b.defectId, b.title, b.module, b.description], 43.2);
    const cells = [
      strCell(0, rowNum, 3, b.defectId, sst),
      strCell(1, rowNum, 3, b.title, sst),
      strCell(2, rowNum, 3, b.module, sst),
      strCell(3, rowNum, 3, b.description, sst),
      strCell(4, rowNum, 7, b.severity, sst),
      strCell(5, rowNum, 7, b.priority, sst),
      strCell(6, rowNum, 7, b.status, sst),
      strCell(7, rowNum, 7, b.reportedBy, sst),
      strCell(8, rowNum, 7, b.assignedTo, sst),
      numCell(9, rowNum, 6, b.excelDateSerial), // s=6 -> numFmtId=14 (Excel Date)
      `<c r="K${rowNum}" s="9"/>`,
      b.comments ? strCell(11, rowNum, 3, b.comments, sst) : `<c r="L${rowNum}" s="9"/>`,
    ].join("");
    bugSheetRowsXml.push(`<row r="${rowNum}" spans="1:12" ht="${ht}" customHeight="1">${cells}</row>`);
  });

  const lastBugRow = Math.max(1, bugs.length + 1);
  const dvEnd = Math.max(309, lastBugRow + 50);
  const sheet2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:L${lastBugRow}"/><sheetViews><sheetView workbookViewId="0"><selection activeCell="A2" sqref="A2"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="14.4"/><cols><col min="1" max="12" width="24" customWidth="1"/></cols><sheetData>${bugSheetRowsXml.join("")}</sheetData><dataValidations count="3"><dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="E2:E${dvEnd}"><formula1>"Critical,High,Medium,Low"</formula1></dataValidation><dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="F2:F${dvEnd}"><formula1>"High,Medium,Low"</formula1></dataValidation><dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="G2:G${dvEnd}"><formula1>"Open,In Progress,Fixed,Retest,Closed,Reopened,Rejected/Invalid,Deferred"</formula1></dataValidation></dataValidations><pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/></worksheet>`;

  // ── Sheet 3: Execution Summary ─────────────────────────────────────────────
  const totalCount = testCases.length;
  const formulaEndRow = Math.max(1009, lastTcRow + 100);

  const sheet3Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:B5"/><sheetViews><sheetView workbookViewId="0"><selection activeCell="B5" sqref="B5"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="14.4"/><cols><col min="1" max="1" width="30.44140625" customWidth="1"/><col min="2" max="2" width="29.5546875" customWidth="1"/></cols><sheetData><row r="1" spans="1:2" ht="20" customHeight="1">${strCell(0, 1, 10, "Metric", sst)}${strCell(1, 1, 10, "Value", sst)}</row><row r="2" spans="1:2" ht="20" customHeight="1">${strCell(0, 2, 11, "Total Test Cases", sst)}<c r="B2" s="11"><f>COUNTA('Test Cases'!A2:A${formulaEndRow})</f><v>${totalCount}</v></c></row><row r="3" spans="1:2" ht="20" customHeight="1">${strCell(0, 3, 11, "Passed", sst)}<c r="B3" s="11"><f>COUNTIF('Test Cases'!H2:H${formulaEndRow},"Pass")</f><v>${passedCount}</v></c></row><row r="4" spans="1:2" ht="20" customHeight="1">${strCell(0, 4, 11, "Failed", sst)}<c r="B4" s="11"><f>COUNTIF('Test Cases'!H2:H${formulaEndRow},"Fail")</f><v>${failedCount}</v></c></row><row r="5" spans="1:2" ht="20" customHeight="1">${strCell(0, 5, 11, "Blocked", sst)}<c r="B5" s="11"><f>COUNTIF('Test Cases'!H2:H${formulaEndRow},"Blocked")</f><v>${blockedCount}</v></c></row></sheetData><pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/></worksheet>`;

  // ── Sheet 4: Dashboard (with Chart!) ───────────────────────────────────────
  const sheet4Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:B4"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><selection sqref="A1:B4"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="14.4"/><cols><col min="1" max="1" width="20" customWidth="1"/><col min="2" max="2" width="20.33203125" customWidth="1"/></cols><sheetData><row r="1" spans="1:2" ht="20" customHeight="1">${strCell(0, 1, 10, "Status", sst)}${strCell(1, 1, 10, "Count", sst)}</row><row r="2" spans="1:2" ht="20" customHeight="1">${strCell(0, 2, 11, "Passed", sst)}<c r="B2" s="11"><f>COUNTIF('Test Cases'!H2:H${formulaEndRow},"Pass")</f><v>${passedCount}</v></c></row><row r="3" spans="1:2" ht="20" customHeight="1">${strCell(0, 3, 11, "Failed", sst)}<c r="B3" s="11"><f>COUNTIF('Test Cases'!H2:H${formulaEndRow},"Fail")</f><v>${failedCount}</v></c></row><row r="4" spans="1:2" ht="20" customHeight="1">${strCell(0, 4, 11, "Blocked", sst)}<c r="B4" s="11"><f>COUNTIF('Test Cases'!H2:H${formulaEndRow},"Blocked")</f><v>${blockedCount}</v></c></row></sheetData><pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/><drawing r:id="rId1"/></worksheet>`;

  // ── Sheet 5: Test Environment ──────────────────────────────────────────────
  const envItems = [
    "Operating System",
    "OS Version",
    "RAM",
    "Processor",
    "Database",
    "Application Version",
    "Tools Used",
  ];
  const envRowsXml = [
    `<row r="1" spans="1:2">${strCell(0, 1, 1, "Environment Item", sst)}${strCell(1, 1, 1, "Details", sst)}</row>`,
    ...envItems.map((item, idx) => `<row r="${idx + 2}" spans="1:2">${strCell(0, idx + 2, 0, item, sst)}</row>`),
  ].join("");

  const sheet5Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:B8"/><sheetViews><sheetView workbookViewId="0"><selection activeCell="B2" sqref="B2"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="14.4"/><cols><col min="1" max="2" width="28" customWidth="1"/></cols><sheetData>${envRowsXml}</sheetData><pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/></worksheet>`;

  // ── Workbook & Core Props ──────────────────────────────────────────────────
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="20417"/><workbookPr/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="23040" windowHeight="8940"/></bookViews><sheets><sheet name="Test Cases" sheetId="1" r:id="rId1"/><sheet name="Defect Log" sheetId="2" r:id="rId2"/><sheet name="Execution Summary" sheetId="3" r:id="rId3"/><sheet name="Dashboard" sheetId="4" r:id="rId4"/><sheet name="Test Environment" sheetId="5" r:id="rId5"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'Test Cases'!$A$1:$K$${lastTcRow}</definedName></definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;

  const nowIso = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const corePropsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>MCIT QA Platform</dc:creator><cp:lastModifiedBy>MCIT QA Platform</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified></cp:coreProperties>`;

  const zipBuffer = createZipBuffer([
    { name: "[Content_Types].xml", content: CONTENT_TYPES_XML },
    { name: "_rels/.rels", content: ROOT_RELS_XML },
    { name: "docProps/app.xml", content: APP_PROPS_XML },
    { name: "docProps/core.xml", content: corePropsXml },
    { name: "xl/workbook.xml", content: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", content: WORKBOOK_RELS_XML },
    { name: "xl/theme/theme1.xml", content: THEME1_XML },
    { name: "xl/styles.xml", content: STYLES_XML },
    { name: "xl/sharedStrings.xml", content: sst.toXml() },
    { name: "xl/worksheets/sheet1.xml", content: sheet1Xml },
    { name: "xl/worksheets/sheet2.xml", content: sheet2Xml },
    { name: "xl/worksheets/sheet3.xml", content: sheet3Xml },
    { name: "xl/worksheets/sheet4.xml", content: sheet4Xml },
    { name: "xl/worksheets/sheet5.xml", content: sheet5Xml },
    { name: "xl/worksheets/_rels/sheet4.xml.rels", content: SHEET4_RELS_XML },
    { name: "xl/drawings/drawing1.xml", content: DRAWING1_XML },
    { name: "xl/drawings/_rels/drawing1.xml.rels", content: DRAWING1_RELS_XML },
    { name: "xl/charts/chart1.xml", content: buildChart1Xml(passedCount, failedCount, blockedCount) },
    { name: "xl/charts/_rels/chart1.xml.rels", content: CHART1_RELS_XML },
    { name: "xl/charts/style1.xml", content: CHART_STYLE1_XML },
    { name: "xl/charts/colors1.xml", content: CHART_COLORS1_XML },
  ]);

  return {
    buffer: zipBuffer,
    totalCount,
    passedCount,
    failedCount,
    blockedCount,
    bugsCount: bugs.length,
  };
}
