"use strict";

(function initHiepTuViSchoolData(root) {
  const kb = root.HiepTuViKBData || (root.HiepTuViKBData = {});

  kb.schools = Object.freeze([
    { id:"SCHOOL-NAM-PHAI", tag:"NAM_PHAI_TAM_HOP", priority:"Thế đứng, tam phương tứ chính, bộ sao, Âm Dương–Ngũ Hành.", cautions:["miếu/vượng có thể khác bảng khác","điều kiện cách cục phải ghi rõ","không dùng nhị hợp/giáp thay tam phương"], source:"HIEP_TUVI_SKILL:schools", source_level:"C", confidence:"CORE" },
    { id:"SCHOOL-TU-HOA", tag:"TU_HOA", priority:"Mạng Tứ Hóa, nguồn Hóa, carrier star, cung đích; phi Hóa/tự Hóa chỉ khi có quy ước rõ.", cautions:["không trộn Tứ Hóa nguyên cục với lưu vận","bảng Hóa phụ thuộc quy ước","không dùng Hóa đơn lẻ như verdict"], source:"HIEP_TUVI_SKILL:schools+tu-hoa", source_level:"C", confidence:"CORE" },
    { id:"SCHOOL-TRUNG-CHAU", tag:"TRUNG_CHAU", priority:"Chỉ dùng khi có nguồn/quy ước cụ thể.", cautions:["không tự gán nhãn hoặc pha rule từ nhánh khác"], source:"HIEP_TUVI_SKILL:schools", source_level:"C", confidence:"CONDITIONAL" },
    { id:"SCHOOL-CLASSICAL", tag:"CLASSICAL", priority:"Quy tắc cổ điển có provenance nhưng chưa gán nhánh hiện đại cụ thể.", cautions:["phải nêu nếu có dị bản","không coi văn bản cổ là bằng chứng khoa học"], source:"HIEP_TUVI_SKILL:schools", source_level:"C", confidence:"CORE" },
    { id:"SCHOOL-MLTC", tag:"MENH_LY_THIEN_CO", priority:"Lớp bài giảng Mệnh Lý Thiên Cơ – Lê Quang Lăng; gần Nam Phái/Tam Hợp nhưng giữ tag riêng để truy nguồn.", cautions:["chỉ dùng rule đã có nội dung nguồn đủ","Shorts/tiêu đề không gánh claim mạnh","không hòa trộn thành Nam Phái chung nếu rule chưa xác minh"], source:"HIEP_TUVI_SKILL:menh-ly-thien-co", source_level:"C", confidence:"CONDITIONAL" }
  ]);

  kb.provenance = Object.freeze({
    source_levels:{
      A:"Văn bản gốc/tài liệu trường phái xác định/quy tắc truy nguyên rõ.",
      B:"Bài giảng dài, có hệ thống, tác giả/trường phái xác định.",
      C:"Tài liệu tổng hợp hoặc nguồn thứ cấp có cấu trúc.",
      D:"Shorts/câu phú đơn lẻ/clip ngắn/bài đăng thiếu bối cảnh/chưa kiểm chứng."
    },
    rule_confidence:{
      CORE:"Quy tắc nền đã xác định của trường phái đang dùng.",
      SUPPORTED:"Nhiều nguồn cùng hệ thống hỗ trợ và điều kiện rõ.",
      CONDITIONAL:"Đúng khi đủ điều kiện hoặc nhạy trường phái.",
      DISPUTED:"Các trường phái/nguồn bất đồng đáng kể.",
      WEAK:"Nguồn ít, thiếu điều kiện hoặc chủ yếu từ nguồn D."
    },
    schema:"RULE-ID | Chủ đề | Sao/bộ sao | Cung | Điều kiện | Kết luận | Ngoại lệ | SCHOOL | SOURCE | SOURCE_LEVEL | RULE_CONFIDENCE | Notes",
    gates:[
      "Không dùng nguồn D làm căn cứ duy nhất cho claim STRONG.",
      "Rule thiếu điều kiện hình học/cung/miếu-hãm tối đa CONDITIONAL.",
      "Hai trường phái cùng tên rule nhưng khác điều kiện phải tạo hai rule riêng.",
      "Chỉ biết tiêu đề video thì không suy diễn chi tiết từ tiêu đề.",
      "Không sao chép dài nguồn; lưu cấu trúc/ý nghĩa cần thiết."
    ],
    source:"HIEP_TUVI_SKILL:source-provenance"
  });

  kb.claimStates = Object.freeze(["STRONG","CONDITIONAL","CONTESTED","INSUFFICIENT","REJECTED"]);
})(typeof globalThis !== "undefined" ? globalThis : this);
