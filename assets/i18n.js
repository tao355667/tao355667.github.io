const chineseTranslations = {
  "skip": "跳至正文",
  "nav.about": "关于",
  "nav.publications": "学术成果",
  "nav.research": "工程",
  "nav.experience": "经历与荣誉",
  "name": "许辰涛",
  "otherName": "Chentao Xu",
  "role": "硕士研究生",
  "affiliation": "北京体育大学<br><span>电子信息 · 大数据技术与工程</span>",
  "location": "中国 · 北京",
  "zhihu": "知乎",
  "juejin": "掘金",
  "about": "关于我",
  "intro": "我是许辰涛，目前在<strong>北京体育大学</strong>攻读电子信息硕士学位，研究方向为<strong>远程光电容积脉搏波描记（rPPG）</strong>与<strong>深度学习</strong>。目前的兴趣是 AI 在健康领域的应用。",
  "interest.deepLearning": "深度学习",
  "interest.health": "医疗健康人工智能",
  "interest.multimodal": "多模态生理感知",
  "education": "教育背景",
  "expected": "预计毕业",
  "education.bsu": "北京体育大学 <span class=\"degree\">硕士研究生</span>",
  "education.masterMajor": "电子信息（大数据技术与工程）",
  "education.average": "均分 88.27 / 100",
  "education.nuist": "南京信息工程大学 <span class=\"degree\">第二学士学位</span>",
  "education.cs": "计算机科学与技术",
  "education.jsu": "江苏大学 <span class=\"degree\">工学学士</span>",
  "education.agriculture": "农业机械化及其自动化",
  "publications": "学术成果",
  "underReview": "审稿中",
  "revision": "修改中",
  "abstract": "研究摘要",
  "conference": "会议论文",
  "conference.title": "远程光电容积脉搏波描记法在生理信息监控中的应用与挑战",
  "conference.authors": "<strong>许辰涛</strong>，杨召阳",
  "conference.venue": "第十四届全国体育科学大会 · 体育工程分会 · 墙报交流",
  "conference.pages": "2025：11564–11565",
  "patent": "发明专利",
  "patent.status": "已公开",
  "patent.title": "一种非接触远程心率估计系统",
  "patent.authors": "北京体育大学 · 导师第一作者，本人第二作者",
  "patent.number": "申请号：202511619577.5 <span>2025.12.12</span>",
  "patent.link": "中国知网",
  "research": "工程",
  "research.system.title": "边缘端非接触心率监测系统",
  "research.system.description": "在 Jetson Orin Nano 上完成从 CSI 视频采集、人脸检测、时序窗口构建到 rPPG 推理与心率可视化的完整流程，结合 OpenCV、GStreamer 与信号处理实现心率估计。",
  "research.system.performance": "使用 TensorRT 后，YOLOv5Face 的单帧推理耗时从约 42 毫秒降至约 7 毫秒。<br>MDWPhys 单次前向推理耗时约 234 毫秒。",
  "experience": "项目经历",
  "experience.guoti": "国体智慧体育技术创新中心",
  "experience.guoti.program": "国家重点研发计划 · “主动健康和人口老龄化科技应对”专项",
  "experience.guoti.description": "参与指标 1.1“运动物理负荷强度感知实验”，负责功率车骑行测试中的现场心率数据采集、设备与采集链路异常记录及协同处理，参与心率带、功率车的版本升级与功能验证。",
  "experience.lotus": "基于机器视觉的莲藕泥藕孔检测方法及装置",
  "experience.lotus.program": "江苏省大学生创新创业训练计划项目 · 共同主持人",
  "experience.lotus.description": "面向糯米藕生产线的莲藕截面淤泥检测，负责图像处理算法设计。通过阈值分割、形态学运算与区域增长提取淤泥区域，结合区域统计特征进行判别。",
  "experience.lotus.number": "依托单位：江苏大学 · 项目编号：202010299260H",
  "honors": "荣誉与证书",
  "honors.bsu": "北京体育大学硕士研究生二等奖学金",
  "honors.years": "2025、2026",
  "honors.nuist": "南京信息工程大学本科生一等奖学金",
  "honors.math": "全国大学生数学建模竞赛江苏赛区二等奖",
  "qualifications.english": "英语 CET-6",
  "qualifications.tableTennis": "乒乓球国家三级裁判",
  "qualifications.badminton": "羽毛球国家三级裁判",
  "traffic.notice": "为统计主页流量，本站记录打开和入库时间、公网 IP、推测位置、设备类型、浏览器、系统及可用的来源域名，每小时清理已满七天的记录。",
  "notFound.title": "页面未找到",
  "notFound.description": "这个页面可能已移动，或链接有误。",
  "notFound.home": "返回主页"
};

const localizedElements = [...document.querySelectorAll('[data-i18n]')];
const englishContents = new Map(localizedElements.map((element) => [element, element.innerHTML]));
const languageToggle = document.querySelector('.floating-language-toggle');
const attributeTranslations = [
  ['.site-name', 'aria-label', 'Chentao Xu, back to top', '许辰涛，返回主页'],
  ['.navigation', 'aria-label', 'Main navigation', '主导航'],
  ['.profile', 'aria-label', 'Profile', '个人资料'],
  ['.portrait', 'alt', 'Portrait of Chentao Xu', '许辰涛的照片'],
  ['.research-interests', 'aria-label', 'Research interests', '研究方向'],
  ['.floating-actions', 'aria-label', 'Page controls', '页面操作'],
  ['.back-to-top', 'aria-label', 'Back to top', '回到顶部'],
  ['.back-to-top', 'title', 'Back to top', '回到顶部'],
];
let currentLanguage = 'en';

function setLanguage(language) {
  currentLanguage = language === 'zh' ? 'zh' : 'en';
  const chinese = currentLanguage === 'zh';
  document.documentElement.lang = chinese ? 'zh-CN' : 'en';
  for (const element of localizedElements) {
    // All markup comes from this site's own static translations.
    element.innerHTML = chinese
      ? chineseTranslations[element.dataset.i18n] ?? englishContents.get(element)
      : englishContents.get(element);
  }
  for (const [selector, attribute, english, chineseText] of attributeTranslations) {
    document.querySelector(selector)?.setAttribute(attribute, chinese ? chineseText : english);
  }
  const otherName = document.querySelector('.english-name');
  if (otherName) otherName.lang = chinese ? 'en' : 'zh-CN';
  const notFound = document.body.dataset.page === 'not-found';
  document.title = notFound
    ? (chinese ? '页面未找到 · 许辰涛' : 'Page Not Found · Chentao Xu')
    : (chinese ? '许辰涛 · 学术主页' : 'Chentao Xu · Academic Homepage');
  const description = chinese
    ? '许辰涛，北京体育大学电子信息硕士研究生。研究方向为远程光电容积脉搏波描记（rPPG）与深度学习，目前关注 AI 在健康领域的应用。'
    : 'Chentao Xu, a master’s student at Beijing Sport University, researching remote photoplethysmography (rPPG), deep learning, and AI applications in healthcare.';
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
  if (languageToggle) {
    languageToggle.querySelector('.floating-language-label').textContent = chinese ? 'EN' : '中';
    languageToggle.lang = chinese ? 'en' : 'zh-CN';
    languageToggle.setAttribute('aria-label', chinese ? 'Switch to English' : '切换为中文');
    languageToggle.title = chinese ? 'Switch to English' : '切换为中文';
    languageToggle.hidden = false;
  }
  document.dispatchEvent(new Event('languagechange'));
}

let savedLanguage = 'en';
try {
  if (localStorage.getItem('preferred-language') === 'zh') savedLanguage = 'zh';
} catch {
  // English remains usable when browser storage is unavailable.
}
setLanguage(savedLanguage);

languageToggle?.addEventListener('click', () => {
  setLanguage(currentLanguage === 'en' ? 'zh' : 'en');
  try {
    localStorage.setItem('preferred-language', currentLanguage);
  } catch {
    // Switching languages does not depend on persistent storage.
  }
});
