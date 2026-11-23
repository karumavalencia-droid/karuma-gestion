// @ts-nocheck
// Reserva rápida: el personal escribe (o dicta) una línea en cualquier orden —
// "Ana 612345678 4 pers mañana 20:30", "四个人 明天 八点半 王先生 612345678" —
// y se extraen nombre, teléfono, personas, fecha, hora y duración.
// Portado tal cual del sistema de Spicy Soul (admin-quick.js), probado con voz en chino y español.

const pad = (n: number) => ("0" + n).slice(-2);
function today(): string { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date()); }
function addDays(d: string, n: number): string { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }

export interface QuickParse { name: string; phone?: string; party?: number; date: string; dateSaid: boolean; time?: string; durationMin?: number }

  function cnNum(t) {
  var d = { 零: 0, 〇: 0, 洞: 0, 幺: 1, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  return t.replace(/[零〇洞幺一二两三四五六七八九十]+/g, function (m) { return " " + one(m) + " "; });
  function one(m) {
    if (m.indexOf("十") < 0) return m.length > 1 ? m.split("").map(function (c) { return d[c]; }).join("") : String(d[m]);
    var p = m.split("十"); return String((p[0] ? d[p[0]] : 1) * 10 + (p[1] ? d[p[1]] : 0));
  }
}
function normalize(text) {
  var t = " " + text + " ";
  // 全角数字、中文标点、“650,182,623”这种逗号
  t = t.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 65248); }).replace(/[＋]/g, "+").replace(/[，。、；！？]/g, " ").replace(/(\d),(?=\d{3}\b)/g, "$1");
  t = t.replace(/[,;]/g, " ");
  // “para dos a las nueve” —— para 后面直接跟数字就是人数
  t = t.replace(/\bpara\s+(\d{1,2}|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince)\b(?!\s*(personas?|pers|pax|comensales|:|h\b|y media))/gi, "$1 personas")
  t = t.replace(/(我想|我要|帮我|订一个|订个|一个位置|预约|位置|桌子|一桌|电话是|电话|号码是|号码|名字是|名字|我叫|晚上|中午|下午|今晚)/g, " ").replace(/[订叫姓我的]/g, " ");
  t = t.replace(/(^|\s)(quiero|quería|queria|reservar|reserva|una mesa|mesa|para|a nombre de|nombre|se llama|me llamo|soy|teléfono|telefono|número|numero|mi|es|el|la|de|del|por favor|hola|vale|sí|si|gracias)(?=\s)/gi, " ");
  // “这周六”“下星期五” —— 先换成西语星期，免得“六”被当成数字
  var cw = { 一: "lunes", 二: "martes", 三: "miércoles", 四: "jueves", 五: "viernes", 六: "sábado", 日: "domingo", 天: "domingo" };
  t = t.replace(/(这个?|下个?|本)?(周|星期|礼拜)([一二三四五六日天])/g, function (m, a, b, c) { return " " + cw[c] + " "; });
  t = t.replace(/(喂|你好|您好|麻烦你?|谢谢|好的|一共|总共|一起|订位|这周|嗯|啊)/g, " ");
  t = cnNum(t);
  // “电话六八八零三二八零三三个人”：电话后面紧跟人数，连成了 10 位
  t = t.replace(/(^|\D)([6789]\d{8})(\d{1,2})\s*(个人|人|位)/g, "$1$2 $3$4");
  // 电话里的“treinta y cuatro”“veintidós”
  var tens = { veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
  var u = { uno: 1, un: 1, una: 1, dos: 2, "dós": 2, tres: 3, "trés": 3, cuatro: 4, cinco: 5, seis: 6, "séis": 6, siete: 7, ocho: 8, nueve: 9 };
  t = t.replace(/\bveinti(uno|un|una|dós|dos|trés|tres|cuatro|cinco|séis|seis|siete|ocho|nueve)\b/gi, function (m, x) { return 20 + u[x.toLowerCase()]; });
  t = t.replace(/\b(veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)(?:\s+y\s+(uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve))?\b/gi, function (m, a, b) { return tens[a.toLowerCase()] + (b ? u[b.toLowerCase()] : 0); });
  // seiscientos cincuenta y dos = 652
  var hund = { cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900 };
  t = t.replace(/\bdieci(séis|seis|siete|ocho|nueve)\b/gi, function (m, x) { return 10 + u[x.toLowerCase()]; });
  t = t.replace(/\b(cien|ciento|doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos)\b(?:\s+(\d{1,2}|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince)\b)?/gi, function (m, a, b) {
    var n = b == null ? 0 : (/\d/.test(b) ? +b : ({ uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15 })[b.toLowerCase()]);
    return hund[a.toLowerCase()] + n; });
  var es = { cero: 0, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15 };
  t = t.replace(/\b(cero|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince)\b/gi, function (w) { return es[w.toLowerCase()]; });
  t = t.replace(/\b(\d{1,2})\s*y\s*media\b/gi, "$1:30").replace(/\b(\d{1,2})\s*y\s*cuarto\b/gi, "$1:15").replace(/\b(\d{1,2})\s*menos\s*cuarto\b/gi, function (m, h) { return (+h - 1) + ":45"; });
  t = t.replace(/\ba las (\d{1,2})\b(?![:.h])/gi, "$1:00").replace(/\ba las\b/gi, " ").replace(/(\d{1,2})\s*(?:de la (?:noche|tarde))/gi, "$1:00");
  t = t.replace(/\bsomos\s+(\d{1,2})\b(?!\s*(personas?|pers|pax))/gi, "$1 personas");
  t = t.replace(/(^|\s)y(?=\s)/gi, " ");
  t = t.replace(/(^|\s)(buenas|buenos|días|dias|tardes|noches|noche|tarde|mediodía|mediodia|este|esta|oiga|mire)(?=\s)/gi, " ").replace(/[.!?¿¡]/g, function (c, i, str) { return /\d/.test(str[i - 1] || "") && /\d/.test(str[i + 1] || "") ? c : " "; });
  // 说话里的填充词：“que van a venir”“somos”
  t = t.replace(/(^|\s)(que|van|vamos|venir|vendrán|vendran|vendremos|somos|seremos|seríamos|seriamos|ser|a|al|en|con|unos|unas|sobre|hacia|eh|pues|bueno|o sea)(?=\s)/gi, " ").replace(/(^|\s)(que|van|venir|a)(?=\s)/gi, " ");
  return t;
}

// 客人改口：“…8点，不对，9点” / “a las 8, no, mejor a las 9” —— 改口后面说的覆盖前面的
var FIX = /(不对|不是|改成|换成|算了|还是|\bno\b,?|\bmejor\b|\bcambia\w*|\bperdón\b|\bperdon\b|\bmejor dicho\b)/i;
// 客人明说的名字：“a nombre de Carmen López”“me llamo…”“我姓王”“我叫王小明”
function saidName(text) {
  // 语音识别常常全小写：“a nombre de carmen lópez” → Carmen López；遇到“teléfono”“somos”这类词就停
  var STOP = /^(y|e|mi|el|la|los|las|para|a|al|de|del|con|que|somos|seremos|teléfono|telefono|número|numero|móvil|movil|por|favor|gracias|vale|hoy|mañana|manana|pasado|esta|este|noche|tarde|personas?|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|no|sí|si|perdón|perdon|mejor|vamos|van|venir|hola|buenas|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince)$/i;
  // 先找把握大的（a nombre de / me llamo），再找 soy / para；每个地方都试，跳过“para este viernes”这种
  var cues = ["a nombre de|me llamo|se llama|mi nombre es|nombre es|nombre de|de parte de", "soy|para"];
  for (var c = 0; c < cues.length; c++) {
    var re = new RegExp("(?:" + cues[c] + ")\\s+([a-záéíóúñü]+(?:\\s+[a-záéíóúñü]+){0,2})", "gi"), m;
    while ((m = re.exec(String(text)))) {
      var w = [], ws = m[1].split(/\s+/);
      // “marta gómez marta con te”：名字重复了就停
      for (var i = 0; i < ws.length && !STOP.test(ws[i]) && ws.slice(0, i).map(function (x) { return x.toLowerCase(); }).indexOf(ws[i].toLowerCase()) < 0; i++) w.push(ws[i].charAt(0).toUpperCase() + ws[i].slice(1).toLowerCase());
      if (w.length) return w.join(" ");
    }
  }
  var m;
  m = String(text).match(/(?:我姓|我叫|名字是|名字叫|姓)\s*([一-龥]{1,3}?)(?=[，。,.\s]|电话|先生|女士|小姐|$)/);
  return m ? m[1] + (/(先生|女士|小姐)/.exec(text.slice(text.indexOf(m[1]) + m[1].length, text.indexOf(m[1]) + m[1].length + 2)) || [""])[0] : "";
}
function parse(text) {
  var parts = String(text || "").split(FIX).filter(function (x) { return x && !FIX.test(x); });
  var said = saidName(text);
  if (parts.length < 2) { var one = parse1(text); if (said) one.name = said; return one; }
  var out = parse1(parts[0]);
  parts.slice(1).forEach(function (p) {
    var o = parse1(p);
    ["phone", "party", "time", "durationMin"].forEach(function (k) { if (o[k]) out[k] = o[k]; });
    if (o.dateSaid) out.date = o.date;
    if (o.name && !out.name) out.name = o.name;
    else if (o.name && !o.phone && !o.party && !o.time && !o.dateSaid) out.name = o.name;   // 只改了名字
  });
  if (said) out.name = said;
  return out;
}
// 找空位的时候：离客人要的时间最近的排前面
function nearest(free, time) {
  var m = function (x) { return +x.slice(0, 2) * 60 + +x.slice(3, 5); };
  return free.slice().sort(function (a, b) { return Math.abs(m(a) - m(time)) - Math.abs(m(b) - m(time)); }).slice(0, 6).sort();
}

function parse1(text) {
  var s = " " + normalize(text).replace(/\s+/g, " ") + " ", out = {};
  function take(re, fn) { var m = s.match(re); if (m) { fn(m); s = s.replace(m[0], " "); } }
  // 电话：9 位以上数字（可以带空格、+34）
  take(/\+?\d{9,15}(?!\d)/, function (m) { out.phone = m[0]; });
  // 一组一组说的：“600 12 34 56”“6 0 0 1 2 3 4 5 6”“+34 600-123-456”
  if (!out.phone) {
    var runs = s.match(/\+?\d+(?:[ \-]+\d+)+/g) || [];
    runs.some(function (r) {
      var g = r.replace(/^\+/, "").split(/[ \-]+/), best = null;
      // 从左往右找连起来 9 位（6/7/8/9 开头，或者 34 开头 11 位）的那一段，别把前面的人数吃进去
      for (var i = 0; i < g.length && !best; i++) for (var j = i, d = ""; j < g.length; j++) {
        d += g[j];
        if ((d.length === 9 && /^[6789]/.test(d)) || (d.length === 11 && /^34[6789]/.test(d))) { best = { d: d, txt: g.slice(i, j + 1) }; break; }
        if (d.length > 11) break;
      }
      if (!best) { var all = g.join(""); if (/^1[3-9]\d{9}$/.test(all) || (all.length >= 10 && all.length <= 12)) best = { d: all, txt: g }; }   // 中国手机 138… 11 位，也收
      if (!best) return false;
      out.phone = (/^34[6789]\d{8}$/.test(best.d) ? "+" : "") + best.d;
      s = s.replace(new RegExp("\\+?" + best.txt.join("[ \\-]+")), " ");
      return true;
    });
  }
  // 人数
  take(/(\d{1,2})\s*(人|位|个人|p\b|pax\b|pers\w*|personas?\b|people\b|comensales\b)/i, function (m) { out.party = +m[1]; });
  // 日期
  var t = today();
  take(/(今天|hoy|today)/i, function () { out.date = t; });
  take(/(明天|mañana|manana|tomorrow)/i, function () { out.date = addDays(t, 1); });
  take(/(后天|pasado mañana)/i, function () { out.date = addDays(t, 2); });
  take(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/, function (m) { out.date = guessYear(+m[1], +m[2]); });
  take(/\b(\d{1,2})[\/.-](0?[1-9]|1[0-2])(?:[\/.-](\d{2,4}))?\b(?![:：h])/, function (m) { out.date = guessYear(+m[2], +m[1], m[3]); });
  var wk = { "周一": 1, "周二": 2, "周三": 3, "周四": 4, "周五": 5, "周六": 6, "周日": 0, "周天": 0, "星期一": 1, "星期二": 2, "星期三": 3, "星期四": 4, "星期五": 5, "星期六": 6, "星期日": 0, "星期天": 0,
    "lunes": 1, "martes": 2, "miércoles": 3, "miercoles": 3, "jueves": 4, "viernes": 5, "sábado": 6, "sabado": 6, "domingo": 0 };
  Object.keys(wk).forEach(function (k) { if (!out.date && s.toLowerCase().indexOf(k) >= 0) { var cur = new Date(t + "T12:00:00Z").getUTCDay(); out.date = addDays(t, (wk[k] - cur + 7) % 7); s = s.replace(new RegExp(k, "i"), " "); } });
  // 吃多久：“2小时”“2 horas”“1.5h”“一个半小时”（员工手动订可以定得比平时短）
  take(/(?:^|\s)([1-4])(?:[.,](5))?\s*(?:horas?|个小时|小时|h)(?![\d:a-z])\s*(半|y media)?/i, function (m) { out.durationMin = +m[1] * 60 + (m[2] || m[3] ? 30 : 0); });
  // 时间：20:30 / 20.30 / 20h30 / 8点半 / 20点 / 8pm
  take(/(\d{1,2})\s*[:：.h]\s*(\d{2})/i, function (m) { out.time = fixHour(+m[1]) + ":" + m[2]; });
  take(/(\d{1,2})\s*点\s*(半|(\d{1,2})\s*分?)?/, function (m) { out.time = fixHour(+m[1]) + ":" + (m[2] === "半" ? "30" : pad(+(m[3] || 0))); });
  take(/(\d{1,2})\s*(pm|am)\b/i, function (m) { var h = +m[1] % 12 + (m[2].toLowerCase() === "pm" ? 12 : 0); out.time = pad(h) + ":00"; });
  // 说电话常常一个一个数字或两三个一组说：“6 12 34 56 78”
  if (!out.phone) take(/(?:\d{1,3}\s+){2,8}\d{1,3}(?=\s)/, function (m) { var d = m[0].replace(/\s/g, ""); if (d.length >= 9 && d.length <= 12) out.phone = d; else s += " " + m[0] + " "; });
  out.dateSaid = !!out.date;
  out.date = out.date || t;
  out.name = s.replace(/[,，;；·]+/g, " ").replace(/\s+/g, " ").trim();
  return out;
}
function fixHour(h) { return pad(h >= 1 && h <= 11 ? h + 12 : h); }   // 店里 13:00 以后营业，“8 点”就是晚上 8 点
function guessYear(month, day, y) {
  var t = today(), year = y ? (+y < 100 ? 2000 + +y : +y) : +t.slice(0, 4);
  var d = year + "-" + pad(month) + "-" + pad(day);
  if (!y && d < t) d = (year + 1) + "-" + pad(month) + "-" + pad(day);
  return d;
}


export function parseQuickReserva(text: string): QuickParse { return parse(text); }
export function nearestTimes(free: string[], time: string): string[] { return nearest(free, time); }
