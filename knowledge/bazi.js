"use strict";

(function initHiepTuViBaziData(root) {
  const kb = root.HiepTuViKBData || (root.HiepTuViKBData = {});

  kb.bazi = Object.freeze({
    sequence:[
      "Xác minh lịch dương/âm, múi giờ và tiết khí.",
      "Lập bốn trụ năm–tháng–ngày–giờ.",
      "Xác định Nhật chủ.",
      "Xét tháng lệnh và khí mùa.",
      "Đánh giá vượng/suy theo phương pháp đang dùng.",
      "Xét thiên can, địa chi.",
      "Xét hợp/xung/hình/hại/phá nếu evidence có.",
      "Xét Thập Thần.",
      "Chỉ dùng dụng thần/hỷ thần/kỵ thần khi SCHOOL và evidence đủ rõ.",
      "Xét đại vận/lưu niên theo đúng lớp thời gian.",
      "Đánh giá sensitivity với giờ sinh/tiết khí."
    ],
    principles:[
      { id:"BAZI-SEASON-001", topic:"Tháng lệnh", rule:"Không đếm số lượng hành để kết luận vượng/suy; phải ưu tiên khí mùa/tháng lệnh, căn, trợ lực, tiết lực, khắc chế và thông quan nếu SCHOOL sử dụng.", school:"CLASSICAL", source:"HIEP_TUVI_SKILL:bazi", source_level:"C", confidence:"CORE" },
      { id:"BAZI-DAYMASTER-001", topic:"Nhật chủ", rule:"Nhật chủ là điểm quy chiếu; mọi quan hệ Thập Thần và cân bằng phải đọc tương đối với Nhật chủ, không từ tỷ lệ hành đơn thuần.", school:"CLASSICAL", source:"HIEP_TUVI_SKILL:bazi", source_level:"C", confidence:"CORE" },
      { id:"BAZI-HIDDEN-001", topic:"Tàng can", rule:"Tàng can là lớp căn và khí ẩn trong địa chi; chỉ dùng khi engine/evidence cung cấp hoặc phương pháp tính rõ. Không tự bịa tàng can nếu dữ liệu khóa không có.", school:"CLASSICAL", source:"HIEP_TUVI_SKILL:bazi", source_level:"C", confidence:"SUPPORTED" },
      { id:"BAZI-TENGODS-001", topic:"Thập Thần", rule:"Đọc Thập Thần như quan hệ chức năng với Nhật chủ; phải xét vị trí, khí mùa, căn và tương tác can chi trước khi kết luận chủ đề.", school:"CLASSICAL", source:"HIEP_TUVI_SKILL:bazi", source_level:"C", confidence:"CORE" },
      { id:"BAZI-INTERACT-001", topic:"Hợp/xung/hình/hại/phá", rule:"Một quan hệ địa chi/can không đủ để dự đoán sự kiện; phải xét tầng, vị trí, lực mùa, cấu trúc toàn cục và đại vận/lưu niên.", school:"CLASSICAL", source:"HIEP_TUVI_SKILL:bazi", source_level:"C", confidence:"CORE" },
      { id:"BAZI-USEFUL-001", topic:"Dụng/Hỷ/Kỵ", rule:"Chỉ xác định dụng/hỷ/kỵ khi SCHOOL có phương pháp rõ và evidence đủ; tách điều hòa khí hậu với cân bằng thân, không dùng công thức thiếu hành nào bổ hành đó.", school:"CLASSICAL", source:"HIEP_TUVI_SKILL:bazi+ngu-hanh", source_level:"C", confidence:"CONDITIONAL" },
      { id:"BAZI-LUCK-001", topic:"Đại vận", rule:"Đại vận là bối cảnh kích hoạt cấu trúc Bát Tự; không dùng một vận để sửa ngược cấu trúc nguyên mệnh và không biến xu hướng thành sự kiện bắt buộc.", school:"CLASSICAL", source:"HIEP_TUVI_SKILL:bazi+luck-periods", source_level:"C", confidence:"CORE" },
      { id:"BAZI-INDEPENDENCE-001", topic:"Đối chiếu Tử Vi", rule:"Chỉ coi Tử Vi và Bát Tự củng cố nhau khi đi đến cùng chủ đề bằng đường suy luận đủ độc lập; nếu cùng dựa trên Ngũ Hành chung thì đánh dấu dependency.", school:"CLASSICAL", source:"HIEP_TUVI_SKILL:bazi+ngu-hanh", source_level:"C", confidence:"CORE" }
    ],
    tenGods:[
      { name:"Tỷ Kiên", family:"peer", meaning:"đồng hành/cạnh tranh cùng loại với Nhật chủ; phải xét lực và vị trí." },
      { name:"Kiếp Tài", family:"peer", meaning:"chia sẻ/cạnh tranh nguồn lực với Nhật chủ; không tự động đồng nghĩa mất tiền." },
      { name:"Thực Thần", family:"output", meaning:"đầu ra, biểu đạt, nuôi dưỡng/sản sinh theo ngữ cảnh." },
      { name:"Thương Quan", family:"output", meaning:"đầu ra mạnh, phản biện/phá khuôn; không tự động bất tuân hay thị phi." },
      { name:"Chính Tài", family:"wealth", meaning:"nguồn lực có cấu trúc/khả năng quản lý giá trị theo ngữ cảnh." },
      { name:"Thiên Tài", family:"wealth", meaning:"nguồn lực/cơ hội linh hoạt; không tự động giàu nhanh." },
      { name:"Chính Quan", family:"officer", meaning:"kỷ luật, chuẩn mực, trách nhiệm/vai trò theo cấu trúc." },
      { name:"Thất Sát", family:"officer", meaning:"áp lực, cạnh tranh, quyền lực khó; phải xét chế hóa." },
      { name:"Chính Ấn", family:"resource", meaning:"hỗ trợ, học tập, bảo hộ, nền tri thức theo cấu trúc." },
      { name:"Thiên Ấn", family:"resource", meaning:"học hỏi/nguồn hỗ trợ khác chuẩn; phải xét cân bằng toàn cục." }
    ],
    anti_patterns:[
      "Không đếm hành cơ học để kết luận vượng/suy.",
      "Không thiếu hành nào bổ hành đó.",
      "Không dùng một hợp/xung/hình/hại/phá để kết luận sự kiện chắc chắn.",
      "Không ép Bát Tự xác nhận Tử Vi.",
      "Không coi tỷ lệ Ngũ Hành là dụng thần."
    ]
  });

  kb.nguHanh = Object.freeze({
    relations:["sinh","được sinh","khắc","bị khắc","đồng hành"],
    rule:"Luôn phân biệt hướng lực: ai sinh ai, ai khắc ai. Sinh có thể làm bên sinh bị tiết lực; khắc có thể là kiểm soát/nỗ lực/chi phí chứ không chỉ xấu.",
    tuvi_stack:"Ngũ Hành cung ↔ Ngũ Hành sao ↔ Ngũ Hành Mệnh",
    bazi_rule:"Không dùng đếm hành; phải xét khí mùa, căn, thông quan, chế hóa và SCHOOL.",
    independence:"Nếu Tử Vi, Bát Tự và Ngũ Hành cùng nói một điều chỉ vì dùng chung quan hệ Ngũ Hành, coi đó là dependency chứ không phải ba bằng chứng độc lập.",
    source:"HIEP_TUVI_SKILL:ngu-hanh", source_level:"C", confidence:"CORE"
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
