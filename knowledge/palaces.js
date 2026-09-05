"use strict";

(function initHiepTuViPalaceData(root) {
  const kb = root.HiepTuViKBData || (root.HiepTuViKBData = {});
  kb.palaces = Object.freeze([
    { id:"PAL-MENH-001", name:"Mệnh", theme:"Nền biểu hiện cá nhân, cách vận hành và thiên hướng.", required_links:["Quan Lộc","Tài Bạch","Thiên Di","cung Thân"], opposite:"Thiên Di", trine:["Quan Lộc","Tài Bạch"], topic_links:["Thân"], school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:palaces+palace-relations", source_level:"C", confidence:"CORE" },
    { id:"PAL-PHUMAU-001", name:"Phụ Mẫu", theme:"Quan hệ với cha mẹ/người nuôi dưỡng, nền hỗ trợ thế hệ trước và cấu trúc quyền uy gia đình.", required_links:["Nô Bộc","Tử Tức","Tật Ách"], opposite:"Tật Ách", trine:["Nô Bộc","Tử Tức"], topic_links:[], school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:palaces+palace-relations", source_level:"C", confidence:"CORE" },
    { id:"PAL-PHUCDUC-001", name:"Phúc Đức", theme:"Nền gia tộc, đời sống tinh thần, sức bền tâm lý theo diễn giải truyền thống.", required_links:["Thiên Di","Phu Thê","Tài Bạch"], opposite:"Tài Bạch", trine:["Thiên Di","Phu Thê"], topic_links:["Mệnh"], school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:palaces+palace-relations", source_level:"C", confidence:"CORE" },
    { id:"PAL-DIENTRACH-001", name:"Điền Trạch", theme:"Tài sản cố định, không gian sống, nền vật chất và khả năng giữ/cải tổ tài sản.", required_links:["Tật Ách","Huynh Đệ","Tử Tức"], opposite:"Tử Tức", trine:["Tật Ách","Huynh Đệ"], topic_links:["Tài Bạch"], school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:palaces+palace-relations", source_level:"C", confidence:"CORE" },
    { id:"PAL-QUANLOC-001", name:"Quan Lộc", theme:"Nghề nghiệp, vai trò xã hội, phương thức làm việc và đường phát triển.", required_links:["Mệnh","Tài Bạch","Phu Thê"], opposite:"Phu Thê", trine:["Mệnh","Tài Bạch"], topic_links:["Thiên Di"], school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:palaces+palace-relations", source_level:"C", confidence:"CORE" },
    { id:"PAL-NOBOC-001", name:"Nô Bộc", theme:"Đồng nghiệp, cấp dưới, đối tác, mạng xã hội và người hỗ trợ.", required_links:["Phụ Mẫu","Tử Tức","Huynh Đệ"], opposite:"Huynh Đệ", trine:["Phụ Mẫu","Tử Tức"], topic_links:["Quan Lộc"], school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:palaces+palace-relations", source_level:"C", confidence:"CORE" },
    { id:"PAL-THIENDI-001", name:"Thiên Di", theme:"Cách biểu hiện ngoài môi trường gốc, ra xã hội, di chuyển và tương tác với hoàn cảnh.", required_links:["Phúc Đức","Phu Thê","Mệnh"], opposite:"Mệnh", trine:["Phúc Đức","Phu Thê"], topic_links:["Quan Lộc"], school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:palaces+palace-relations", source_level:"C", confidence:"CORE" },
    { id:"PAL-TATACH-001", name:"Tật Ách", theme:"Điểm yếu, áp lực, rủi ro và sức khỏe trong ngôn ngữ truyền thống; không thay y khoa.", required_links:["Điền Trạch","Huynh Đệ","Phụ Mẫu"], opposite:"Phụ Mẫu", trine:["Điền Trạch","Huynh Đệ"], topic_links:[], school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:palaces+palace-relations", source_level:"C", confidence:"CORE" },
    { id:"PAL-TAIBACH-001", name:"Tài Bạch", theme:"Khả năng tạo, quản lý và lưu chuyển nguồn lực.", required_links:["Mệnh","Quan Lộc","Phúc Đức"], opposite:"Phúc Đức", trine:["Mệnh","Quan Lộc"], topic_links:["Điền Trạch"], school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:palaces+palace-relations", source_level:"C", confidence:"CORE" },
    { id:"PAL-TUTUC-001", name:"Tử Tức", theme:"Con cái, quan hệ thế hệ sau và các dự án/đầu ra do mình tạo ra.", required_links:["Phụ Mẫu","Nô Bộc","Điền Trạch"], opposite:"Điền Trạch", trine:["Phụ Mẫu","Nô Bộc"], topic_links:["Phu Thê","Mệnh"], school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:palaces+palace-relations", source_level:"C", confidence:"CORE" },
    { id:"PAL-PHUTHE-001", name:"Phu Thê", theme:"Mẫu quan hệ đôi lứa/hôn nhân theo hệ truyền thống.", required_links:["Phúc Đức","Thiên Di","Quan Lộc"], opposite:"Quan Lộc", trine:["Phúc Đức","Thiên Di"], topic_links:["Mệnh","Tử Tức"], school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:palaces+palace-relations", source_level:"C", confidence:"CORE" },
    { id:"PAL-HUYNHDE-001", name:"Huynh Đệ", theme:"Anh chị em, người ngang hàng gần gũi, cấu trúc hỗ trợ/cạnh tranh trong gia đình.", required_links:["Điền Trạch","Tật Ách","Nô Bộc"], opposite:"Nô Bộc", trine:["Điền Trạch","Tật Ách"], topic_links:[], school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:palaces+palace-relations", source_level:"C", confidence:"CORE" }
  ]);

  kb.geometry = Object.freeze({
    order:["Mệnh","Phụ Mẫu","Phúc Đức","Điền Trạch","Quan Lộc","Nô Bộc","Thiên Di","Tật Ách","Tài Bạch","Tử Tức","Phu Thê","Huynh Đệ"],
    trines:[
      ["Mệnh","Quan Lộc","Tài Bạch"],
      ["Phụ Mẫu","Nô Bộc","Tử Tức"],
      ["Phúc Đức","Thiên Di","Phu Thê"],
      ["Điền Trạch","Tật Ách","Huynh Đệ"]
    ],
    opposites:[["Mệnh","Thiên Di"],["Phụ Mẫu","Tật Ách"],["Phúc Đức","Tài Bạch"],["Điền Trạch","Tử Tức"],["Quan Lộc","Phu Thê"],["Nô Bộc","Huynh Đệ"]],
    rules:[
      "Tam phương tứ chính là lớp hình học chính trước khi kết luận một cung.",
      "Nhị hợp và giáp cung chỉ là lớp bổ sung; không override một cấu trúc tam phương mạnh nếu không có căn cứ SCHOOL.",
      "Cung liên đới theo chủ đề chỉ được kéo vào khi có thể làm đổi kết luận."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
