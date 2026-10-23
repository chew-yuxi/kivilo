import type { Messages } from './en'

/// Thai, matching the app's `app_th.arb`. Needs a native speaker's review before it
/// reaches people. Dates use the Gregorian calendar, as the app does.
export const th: Messages = {
  intl: 'th-TH-u-ca-gregory',

  party: { LANDLORD: 'ผู้ให้เช่า', TENANT: 'ผู้เช่า' },

  maintenanceStatus: {
    REPORTED: 'แจ้งแล้ว',
    ACKNOWLEDGED: 'รับเรื่องแล้ว',
    SCHEDULED: 'นัดหมายแล้ว',
    AWAITING_CONFIRMATION: 'รอการยืนยัน',
    RESOLVED: 'แก้ไขแล้ว',
    CLOSED_NO_ACTION: 'ปิดโดยไม่ดำเนินการ',
  },

  proposal: {
    sharedPays: (cap) => `ผู้เช่าจ่าย S$${cap} แรก ส่วนที่เหลือผู้ให้เช่าจ่าย`,
    pays: (party) => `${party}จ่าย`,
    arranges: (party) => `${party}เป็นผู้จัดการซ่อม`,
  },

  notification: {
    maintenanceReported: (address) => `${address}: มีการแจ้งปัญหาการซ่อมบำรุง`,
    maintenanceStatus: (status) => `สถานะงานซ่อมเปลี่ยนเป็น “${status}”`,
    visitCompleted: 'ซ่อมสำเร็จไหม โปรดยืนยัน',
    visitScheduled: 'นัดช่างเข้าซ่อมแล้ว',
    repeatRepairTitle: 'ประวัติการซ่อมซ้ำ',
    repeatRepairBody: (count) => `อุปกรณ์นี้มีการซ่อมเสร็จแล้ว ${count} ครั้งในช่วง 365 วันที่ผ่านมา`,
    verifiedFixed: (party) => `${party}ยืนยันว่าซ่อมเรียบร้อยแล้ว`,
    verifiedNotFixed: (party) => `${party}แจ้งว่าปัญหายังไม่หาย`,
    costProposed: (party, terms) => `${party}เสนอ: ${terms}`,
    costAccepted: (party, terms) => `${party}ยอมรับ: ${terms}`,
    costRejected: (party, terms) => `${party}ปฏิเสธ: ${terms}`,
    costWithdrawn: (party) => `${party}ถอนข้อเสนอค่าใช้จ่ายแล้ว`,
    overdueTitle: 'รายงานงานซ่อมรอการรับเรื่อง',
    renewalTitle: 'ถึงเวลาต่อสัญญา',
    renewalBody: (address, endDate) => `${address}: สัญญาเช่าสิ้นสุด ${endDate} โปรดจัดการต่อสัญญากับผู้ให้เช่าและผู้เช่า`,
    moveInReported: 'ผู้เช่าแจ้งว่าสภาพนี้มีอยู่ตั้งแต่ย้ายเข้า โปรดรับทราบหรือโต้แย้งประกาศที่ระบุวันที่',
    moveInDisputed: (reason) => `ผู้ให้เช่าโต้แย้งประกาศสภาพตอนย้ายเข้า: ${reason}`,
    moveInAccepted: 'ผู้ให้เช่ารับทราบประกาศสภาพตอนย้ายเข้าของคุณแล้ว ตอนนี้นับรวมในข้อมูลอ้างอิงเช็กอินที่ตกลงกัน',
    propertySharedTitle: (agent) => `${agent} แชร์ที่พักกับคุณ`,
    propertySharedBody: (agent, address) => `${agent} เพิ่มคุณเป็นผู้ร่วมงานของ ${address}`,
    propertyAssignedTitle: (actor) => `${actor} มอบหมายที่พักให้คุณ`,
    propertyAssignedBody: (actor, address) => `${actor} มอบหมาย ${address} ให้คุณ`,
    agencyInvitationTitle: (agency) => `เข้าร่วม ${agency} บน Kivilo`,
    agencyInvitationBody: (actor, agency) => `${actor} เชิญคุณเข้าร่วม ${agency} โปรดตรวจสอบและตอบรับคำเชิญภายใน 7 วัน`,
    reportUpdatedTitle: (address) => `รายงานของ ${address} มีการอัปเดต`,
    reportUpdatedBody: (number, title) => `บันทึกเพิ่มเติมที่ ${number}: ${title} โปรดตรวจสอบและรับทราบ`,
    depositTitle: (address) => `ใบสรุปเงินประกันของ ${address}`,
    depositBody: (deductions, deposit) => `การประเมินเช็กเอาต์เสนอให้หัก ${deductions} จากเงินประกัน ${deposit} โปรดยอมรับหรือโต้แย้ง`,
  },

  email: {
    signIn: {
      subject: (code) => `${code} คือรหัสลงชื่อเข้าใช้ Kivilo ของคุณ`,
      line: (code) => `รหัสลงชื่อเข้าใช้ Kivilo ของคุณคือ ${code}`,
      heading: 'รหัสลงชื่อเข้าใช้ Kivilo ของคุณ',
      enter: 'ป้อนรหัสนี้ในแอปเพื่อลงชื่อเข้าใช้ให้เสร็จ',
      enterText: 'ป้อนรหัสในแอปเพื่อลงชื่อเข้าใช้ให้เสร็จ รหัสหมดอายุใน 1 ชั่วโมงและใช้ได้ครั้งเดียว',
      expires: 'รหัสหมดอายุใน 1 ชั่วโมงและใช้ได้ครั้งเดียว หากคุณไม่ได้ขอลงชื่อเข้าใช้ ไม่ต้องสนใจอีเมลนี้',
      ignore: 'หากคุณไม่ได้ขอลงชื่อเข้าใช้ ไม่ต้องสนใจอีเมลนี้',
    },
    accountDeleted: {
      subject: 'ลบบัญชี Kivilo ของคุณเรียบร้อยแล้ว',
      body: 'บัญชี Kivilo ของคุณถูกลบแล้ว',
      retained: 'ข้อมูลที่เก็บไว้เพื่อฝ่ายอื่นหรือตามกฎหมาย ยังอยู่ภายใต้นโยบายการเก็บรักษาข้อมูลที่เราเผยแพร่',
    },
    maintenanceFooter: 'เปิด Kivilo เพื่อดูไทม์ไลน์งานซ่อมและตอบกลับ',
    renewalFooter: 'เปิด การตรวจ ใน Kivilo เพื่อเริ่มต่อสัญญา ทำเครื่องหมายว่าไม่ต่อสัญญา หรือปิดการเตือน',
    propertyShared: {
      open: (link) => `เปิดที่พัก: ${link}`,
      signIn: 'ลงชื่อเข้าใช้ Kivilo ด้วยอีเมลที่ได้รับข้อความนี้',
      together: 'คุณทำงานกับสัญญาเช่านี้ร่วมกันได้ ทั้งรูปภาพ รายการทรัพย์สิน และงานซ่อม',
    },
    agencyInvitation: {
      review: (link) => `ดูคำเชิญ: ${link}`,
      signIn: 'ลงชื่อเข้าใช้ด้วยอีเมลที่ได้รับข้อความนี้ การเข้าร่วมทีมจะไม่แชร์ที่พักส่วนตัวของคุณ',
    },
    reportUpdate: {
      subject: (title) => `${title} โปรดตรวจสอบและรับทราบ`,
      review: (link) => `ตรวจสอบและรับทราบได้ที่: ${link}`,
      app: 'คุณยังเปิดรายงานในแอป Kivilo และรับทราบที่นั่นได้',
    },
    hello: (name) => `สวัสดีคุณ ${name}`,
    reportName: (kind, address) => `รายงาน${kind === 'CHECK_OUT' ? 'เช็กเอาต์' : 'เช็กอิน'}ของ ${address}`,
    roleName: { landlord: 'ผู้ให้เช่า', tenant: 'ผู้เช่า' },
    yourAgent: 'นายหน้าของคุณ',
    agentOf: (agent, agency) => `${agent} จาก ${agency}`,
    signatureRequest: {
      subject: (report) => `โปรดตรวจสอบและลงนาม${report}`,
      heading: 'โปรดตรวจสอบและลงนาม',
      intro: (from, report, role) => `${from} ส่ง${report}ให้คุณลงนามในฐานะ${role}`,
      reviewHere: 'ตรวจสอบและลงนามได้ที่:',
      button: 'ตรวจสอบและลงนาม',
      signIn: 'คุณจะต้องลงชื่อเข้าใช้ด้วยรหัสที่ส่งไปยังอีเมลนี้ เพื่อให้มีเพียงคุณที่ลงนามได้ หากคุณใช้ Kivilo อยู่แล้ว จะเป็นบัญชีเดียวกัน',
      app: 'อยากใช้แอป? เปิดแอป Kivilo แล้วลงชื่อเข้าใช้ด้วยอีเมลนี้ รายงานรอให้คุณลงนามอยู่ที่นั่น',
      after: 'เมื่อทั้งสองฝ่ายลงนามแล้ว เราจะส่งรายงานที่ลงนามแล้วเป็น PDF ทางอีเมล',
    },
    handover: {
      subject: (address) => `ข้อมูลการส่งมอบของคุณที่ ${address}`,
      period: (days, deadline) =>
        `ระยะเวลาแจ้งความชำรุดเมื่อย้ายเข้า ${days} วันของสัญญาเช่าคุณสิ้นสุดวันที่ ${deadline} เมื่อสิ้นวันตามเวลาสิงคโปร์ หากมีสิ่งใดเสียอยู่แล้วตอนย้ายเข้า โปรดแจ้งภายในกำหนดนั้น`,
      noPeriod: 'สัญญาเช่านี้ไม่ได้เปิดระยะเวลาแจ้งความชำรุดเมื่อย้ายเข้า คุณยังแจ้งซ่อมในแอป Kivilo ได้',
      countersigned: 'ทั้งสองฝ่ายลงนามแล้ว รายงานที่ลงนามแล้วจะส่งแยกเป็น PDF',
      tenantSigned: 'คุณลงนามรายงานเช็กอินแล้ว เมื่อผู้ให้เช่าลงนามด้วย เราจะส่งรายงานที่ลงนามแล้วเป็น PDF ทางอีเมล',
      details: 'รายงานและข้อมูลการส่งมอบของคุณ:',
      signIn: 'ลงชื่อเข้าใช้ด้วยรหัสที่ส่งไปยังอีเมลนี้ หากคุณใช้แอป Kivilo ให้ลงชื่อเข้าใช้ด้วยอีเมลเดียวกันเพื่อดูสัญญาเช่าและแจ้งปัญหา',
      notice: 'รายงานความชำรุดเมื่อย้ายเข้าเป็นคำแถลงที่ระบุวันที่ของคุณจนกว่าผู้ให้เช่าจะรับทราบ รายงานเช็กอินที่ลงนามแล้วจะไม่เปลี่ยน',
    },
    signedCopy: {
      subject: (report) => `ลงนามแล้ว: ${report}`,
      attached: (report) => `ทั้งสองฝ่ายลงนาม${report}แล้ว รายงานที่ลงนามแล้วแนบมาเป็น PDF โปรดเก็บไว้กับเอกสารสัญญาเช่า`,
      linked: (report) => `ทั้งสองฝ่ายลงนาม${report}แล้ว รายงานมีขนาดใหญ่เกินกว่าจะแนบได้ โปรดดาวน์โหลด PDF ที่นี่และเก็บไว้กับเอกสารสัญญาเช่า:`,
      linkSignIn: 'คุณจะต้องลงชื่อเข้าใช้ด้วยรหัสที่ส่งไปยังอีเมลนี้ เพื่อให้มีเพียงคุณที่เปิดได้',
      signature: (role, name, when) => `${role}: ${name} ลงนามเมื่อ ${when}`,
      fingerprint: 'PDF พิมพ์ลายนิ้วมือเนื้อหาของรายงานที่แต่ละคนลงนามไว้ข้างลายเซ็น เพื่อให้เทียบสำเนาสองฉบับใดก็ได้',
    },
  },
}
