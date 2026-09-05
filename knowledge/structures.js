"use strict";

(function initHiepTuViStructureData(root) {
  const kb = root.HiepTuViKBData || (root.HiepTuViKBData = {});

  kb.structures = Object.freeze([
    { id:"STRUCT-PRIORITY-001", topic:"Ưu tiên đọc", rule:"Ưu tiên chính tinh + bộ sao chính → Tứ Hóa → trợ/sát tinh có sức cấu trúc → vòng sao → sao nhỏ. Không đếm sao tốt/xấu cơ học.", school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:tuvi-palace-method", source_level:"C", confidence:"CORE" },
    { id:"STRUCT-NGUHANH-001", topic:"Ngũ Hành cung-sao-Mệnh", rule:"Theo dõi hướng lực: cung sinh sao, sao sinh cung, cung khắc sao, sao khắc cung, đồng hành; sau đó kiểm sao↔Mệnh và cung↔Mệnh. Sinh không tự động tốt; khắc không tự động xấu.", school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:ngu-hanh", source_level:"C", confidence:"CORE" },
    { id:"STRUCT-COMBO-001", topic:"Bộ sao", rule:"Mỗi bộ phải kiểm thành viên bắt buộc, hình học, sao lõi/modifier, cát-sát phá/cứu, Tứ Hóa, Tuần/Triệt và ghi complete|partial|broken.", school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:star-combinations+formations", source_level:"C", confidence:"CORE" },
    { id:"STRUCT-VOID-001", topic:"Vô Chính Diệu", rule:"Không gọi là cung trống; đọc đối cung và toàn tam phương tứ chính; phân biệt mượn sao đối cung với sao tọa thủ; kiểm Tuần/Triệt, cát-sát, Ngũ Hành và Tứ Hóa; hạ confidence khi SCHOOL khác nhau.", school:"CLASSICAL", source:"HIEP_TUVI_SKILL:tuvi-palace-method", source_level:"C", confidence:"CONDITIONAL" },
    { id:"STRUCT-TP-TC-001", topic:"Tam phương tứ chính", rule:"Bắt buộc đọc bản cung + hai tam hợp + đối cung trước khi chốt. Đây là lớp hình học chính.", school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:tuvi-palace-method+palace-relations", source_level:"C", confidence:"CORE" },
    { id:"STRUCT-NHI-GIAP-001", topic:"Nhị hợp và giáp cung", rule:"Dùng như lớp bổ sung sau tam phương tứ chính; không override cấu trúc tam phương mạnh nếu không có căn cứ SCHOOL.", school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:tuvi-palace-method", source_level:"C", confidence:"CORE" },
    { id:"STRUCT-MENHTHAN-001", topic:"Mệnh-Thân", rule:"Đọc Mệnh → Mệnh–Tài–Quan → Mệnh–Di → cung Thân cư → cấu trúc cung Thân → tam phương/đối cung của Thân → Tứ Hóa nối Mệnh–Thân → kiểm đồng hướng hay căng kéo.", school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:menh-than", source_level:"C", confidence:"CORE" },
    { id:"STRUCT-CROSS-001", topic:"Cross-palace synthesis", rule:"Sau đủ 12 cung quét Mệnh–Tài–Quan, Mệnh–Di, Phúc–Di–Phu, Quan–Phu, Phúc–Tài, Điền–Tật–Huynh, cung chứa Thân và các chuỗi Tứ Hóa lặp. Chỉ giữ theme sống sót qua contradiction checks.", school:"NAM_PHAI_TAM_HOP", source:"HIEP_TUVI_SKILL:tuvi-palace-method", source_level:"C", confidence:"CORE" }
  ]);

  kb.tuHoa = Object.freeze({
    transformations:[
      { name:"Hóa Lộc", native:"Tăng nguồn lực/thu hút/lợi ích theo ngữ cảnh." },
      { name:"Hóa Quyền", native:"Quyền tác động, kiểm soát, sức đẩy, trách nhiệm." },
      { name:"Hóa Khoa", native:"Chuẩn hóa, học thức/danh tiếng, giảm ma sát trong một số cấu trúc." },
      { name:"Hóa Kỵ", native:"Nút ma sát, ám ảnh, trì trệ, sai lệch hoặc nơi phải trả giá/chú ý." }
    ],
    network_rule:"source layer/can → carrier star → destination palace → geometry to target → interaction with existing star group → net effect",
    layers:["nguyên cục/năm sinh","đại hạn","lưu niên","lưu tháng/ngày khi thật sự cần","phi Hóa/tự Hóa là lớp riêng theo SCHOOL"],
    checks:["Hóa phát từ đâu?","Sao nào mang Hóa?","Sao đó vốn mạnh/yếu ra sao?","Nằm cung nào?","Có đồng cung/tam hợp/xung/nhị hợp/giáp với cung mục tiêu không?","Tác động vào bộ sao hoàn chỉnh hay chỉ một thành viên?","Hóa Kỵ có đánh đúng node vốn yếu không?","Lộc–Quyền–Khoa hội tụ hay phân tán?"],
    anti_patterns:["Không trộn các tầng Tứ Hóa để tạo nhiều bằng chứng.","Không tự dùng bảng Tứ Hóa ghi nhớ nếu engine đã có bảng khóa.","Không biến Hóa Lộc/Khoa thành đại cát hoặc Hóa Kỵ thành đại hung độc lập."],
    school:"TU_HOA", source:"HIEP_TUVI_SKILL:tu-hoa", source_level:"C", confidence:"CORE"
  });

  kb.tuanTriet = Object.freeze({
    rule:"Tuần/Triệt là bộ điều biến cấu trúc, nhịp biểu hiện và tính liên tục; không phải nút xóa sao.",
    checks:["đang tác động vào chính tinh/bộ sao nào","làm suy yếu phần tốt, xấu hay cả hai","có biến formation complete thành partial/broken không","có làm biểu hiện chậm/gián đoạn/đổi pha không","Tứ Hóa có đi qua đúng node bị Tuần/Triệt không","SCHOOL đánh giá sức Tuần/Triệt ra sao"],
    anti_patterns:["Triệt = mất hết","Tuần gặp sát tinh = tự động tốt","cát tinh gặp Triệt = vô dụng"],
    school:"CLASSICAL", source:"HIEP_TUVI_SKILL:tuan-triet", source_level:"C", confidence:"CORE"
  });

  kb.trangSinh = Object.freeze({
    cycle:["Tràng Sinh","Mộc Dục","Quan Đới","Lâm Quan","Đế Vượng","Suy","Bệnh","Tử","Mộ","Tuyệt","Thai","Dưỡng"],
    rule:"Đọc như pha khí/nhịp phát triển: khởi phát → tăng trưởng → trưởng thành → cực thịnh → suy giảm → thu tàng/đứt pha → thai nghén/nuôi dưỡng.",
    common_start_rule:"Một quy ước Việt Nam phổ biến: Thủy Nhị Cục & Thổ Ngũ Cục khởi Thân; Mộc Tam Cục khởi Hợi; Kim Tứ Cục khởi Tỵ; Hỏa Lục Cục khởi Dần. Nếu engine đã an sẵn vòng, ưu tiên dữ liệu engine.",
    anti_patterns:["Tử/Tuyệt ≠ tai họa chắc chắn","Đế Vượng ≠ tự động đại cát","Không để Tràng Sinh lấn át bộ sao, tam phương và Tứ Hóa"],
    school:"CLASSICAL", source:"HIEP_TUVI_SKILL:trang-sinh", source_level:"C", confidence:"CONDITIONAL"
  });

  kb.timeLayers = Object.freeze({
    layers:[
      { name:"Nguyên cục", meaning:"Nền khả năng và cấu trúc lâu dài." },
      { name:"Đại hạn", meaning:"Bối cảnh/giai đoạn dài." },
      { name:"Lưu niên", meaning:"Lớp kích hoạt năm." },
      { name:"Lưu tháng", meaning:"Lớp tinh chỉnh khi thật sự cần." }
    ],
    forecast_gate:["nguyên cục đã có nền","đại hạn làm chủ đề hoạt động hơn","lưu niên kích hoạt node/cung/bộ sao phù hợp","không có phản chứng mạnh","dữ kiện thực tế không phủ định"],
    anti_patterns:["không nhìn một lưu tinh rồi dự đoán biến cố","không trộn Tứ Hóa nguyên cục và lưu vận thành một tầng","không biến cửa sổ biến động thành sự kiện bắt buộc"],
    output_pattern:"nền → điều kiện kích hoạt → loại biến động → dấu hiệu thực tế cần theo dõi → confidence",
    school:"CLASSICAL", source:"HIEP_TUVI_SKILL:luck-periods", source_level:"C", confidence:"CORE"
  });

  kb.redTeam = Object.freeze([
    "Có đọc một sao độc lập không?",
    "Có bỏ tam phương tứ chính không?",
    "Có bỏ nhị hợp/giáp cung quan trọng không?",
    "Có gọi cách khi thiếu điều kiện không?",
    "Có trộn tầng Tứ Hóa/vận không?",
    "Có trộn trường phái không?",
    "Có rule không truy được nguồn không?",
    "Có dùng nguồn D quá mạnh không?",
    "Có Barnum/hindsight/cherry-picking không?",
    "Có biến biểu tượng truyền thống thành quan hệ nhân quả không?",
    "Phản giả thuyết mạnh nhất là gì?",
    "Nếu bỏ toàn bộ huyền học, lời giải thực tế mạnh nhất là gì?"
  ]);
})(typeof globalThis !== "undefined" ? globalThis : this);
