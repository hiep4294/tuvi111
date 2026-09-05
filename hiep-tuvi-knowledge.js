"use strict";

(function initHiepTuViKnowledge(root) {
  const VERSION = "1.0.0";

  const PALACE_THEMES = Object.freeze({
    "Mệnh": "Nền biểu hiện cá nhân, cách vận hành và thiên hướng; bắt buộc đọc với Thân, Tài, Quan, Di.",
    "Phụ Mẫu": "Cha mẹ/người nuôi dưỡng, nền hỗ trợ thế hệ trước và cấu trúc quyền uy gia đình theo ngữ cảnh hiện đại.",
    "Phúc Đức": "Nền gia tộc, đời sống tinh thần, sức bền tâm lý theo diễn giải truyền thống; không quy kết nghiệp như fact.",
    "Điền Trạch": "Tài sản cố định, không gian sống, nền vật chất, khả năng giữ/cải tổ bất động sản theo bối cảnh.",
    "Quan Lộc": "Nghề nghiệp, vai trò xã hội, phương thức làm việc, đường phát triển; đọc với Mệnh–Tài và đối cung Phu Thê.",
    "Nô Bộc": "Đồng nghiệp, cấp dưới, đối tác, mạng xã hội/người hỗ trợ; không suy đoán lòng trung thành tuyệt đối.",
    "Thiên Di": "Biểu hiện ngoài môi trường gốc, ra xã hội, di chuyển và tương tác với hoàn cảnh; là đối cung quan trọng của Mệnh.",
    "Tật Ách": "Điểm yếu, áp lực, rủi ro và sức khỏe trong ngôn ngữ truyền thống; không chẩn đoán bệnh.",
    "Tài Bạch": "Khả năng tạo, quản lý, lưu chuyển nguồn lực; đọc với Mệnh–Quan và đối cung Phúc Đức.",
    "Tử Tức": "Con cái/quan hệ thế hệ sau và dự án do mình tạo ra; không kết luận vô sinh hay giới tính thai nhi.",
    "Phu Thê": "Mẫu quan hệ đôi lứa/hôn nhân; không dùng để khẳng định ngoại tình, ý định hay đạo đức người khác.",
    "Huynh Đệ": "Anh chị em/người ngang hàng gần gũi, cấu trúc hỗ trợ và cạnh tranh trong gia đình.",
  });

  const STAR_RULES = Object.freeze({
    "Tử Vi": "chủ trục, điều phối, vị thế, quy tụ, trách nhiệm.",
    "Thiên Cơ": "tính toán, phương án, thay đổi, kỹ thuật, cơ biến, tư duy chiến lược.",
    "Thái Dương": "biểu hiện ra ngoài, chủ động, danh tiếng, soi sáng, tính công khai.",
    "Vũ Khúc": "thực thi, tài chính, kỷ luật, định lượng và chịu áp lực.",
    "Thiên Đồng": "thích nghi, hưởng thụ, phúc khí, mềm dẻo, biến đổi theo hoàn cảnh.",
    "Liêm Trinh": "nguyên tắc, ranh giới, ham muốn, kiểm soát, cạnh tranh, quy phạm.",
    "Thiên Phủ": "tích trữ, quản trị, giữ nguồn lực, ổn định và bảo toàn.",
    "Thái Âm": "tài nguyên, tích lũy, nội tâm, quan sát, kín đáo và nuôi dưỡng.",
    "Tham Lang": "ham muốn, giao tế, thu hút, khai thác cơ hội, đa tài và trải nghiệm.",
    "Cự Môn": "ngôn ngữ, tranh luận, nghi vấn, phân tích; thị phi chỉ khi cấu trúc bất lợi.",
    "Thiên Tướng": "hỗ trợ, điều phối, bảo hộ, quy trình, trung gian/đại diện.",
    "Thiên Lương": "nguyên tắc, che chở, chuẩn mực, cứu giải, kinh nghiệm và độ bền.",
    "Thất Sát": "quyết đoán, áp lực, cắt bỏ, mạo hiểm có kiểm soát, quyền lực trong hoàn cảnh khó.",
    "Phá Quân": "phá cũ, tái cấu trúc, thử nghiệm, biến động, chấp nhận chi phí chuyển đổi.",

    "Tả Phù": "hỗ trợ, phối hợp, nguồn lực phụ trợ; chỉ mạnh khi cấu trúc chính cho phép.",
    "Hữu Bật": "hỗ trợ, phối hợp, nguồn lực phụ trợ; chỉ mạnh khi cấu trúc chính cho phép.",
    "Văn Xương": "học thuật, biểu đạt, văn bản/nghệ thuật; có thể làm mạnh cả năng lực lẫn độ phức tạp.",
    "Văn Khúc": "học thuật, biểu đạt, văn bản/nghệ thuật; có thể làm mạnh cả năng lực lẫn độ phức tạp.",
    "Thiên Khôi": "cơ hội, quý nhân, khả năng được nhìn thấy/nâng đỡ theo quan niệm truyền thống.",
    "Thiên Việt": "cơ hội, quý nhân, khả năng được nhìn thấy/nâng đỡ theo quan niệm truyền thống.",
    "Ân Quang": "phúc trợ/cứu giải; không dùng để xóa toàn bộ cấu trúc bất lợi.",
    "Thiên Quý": "phúc trợ/cứu giải; không dùng để xóa toàn bộ cấu trúc bất lợi.",
    "Lộc Tồn": "tài nguyên, duy trì, tích lũy; phải xét với cung và Tứ Hóa.",
    "Thiên Mã": "dịch chuyển, động lực, thay đổi môi trường; không tự động đồng nghĩa đi xa/phát tài.",
    "Đào Hoa": "sức hút, quan hệ, cảm xúc, biểu hiện xã hội; không suy đạo đức hay ngoại tình.",
    "Hồng Loan": "sức hút, quan hệ, cảm xúc, biểu hiện xã hội; không suy đạo đức hay ngoại tình.",
    "Thiên Hỷ": "hỷ khí, kết nối, biểu hiện xã hội; chỉ là modifier theo cấu trúc.",
    "Thiên Diêu": "sức hút/cảm xúc/biểu hiện xã hội; không dùng làm verdict quan hệ.",
    "Kình Dương": "cạnh tranh, cản lực, sức ép trực diện; phải hỏi đang phá/chế cái gì.",
    "Đà La": "cản lực, trì kéo, ma sát kéo dài; phải hỏi đang phá/chế cái gì.",
    "Hỏa Tinh": "bộc phát, tốc độ, nhiệt, biến đổi đột ngột theo ngôn ngữ truyền thống.",
    "Linh Tinh": "bộc phát, tốc độ, nhiệt, biến đổi đột ngột theo ngôn ngữ truyền thống.",
    "Địa Không": "đứt gãy, rỗng hụt, cực đoan/biến đổi mạnh; không đồng nghĩa tai họa chắc chắn.",
    "Địa Kiếp": "đứt gãy, rỗng hụt, cực đoan/biến đổi mạnh; không đồng nghĩa tai họa chắc chắn.",
    "Thiên Hình": "cắt, quy phạm, kỹ thuật, hình pháp/va chạm theo ngữ cảnh; không suy phạm tội.",
    "Hóa Lộc": "tăng nguồn lực, thu hút, lợi ích theo ngữ cảnh; phải đọc nguồn Hóa → sao → cung.",
    "Hóa Quyền": "quyền tác động, kiểm soát, sức đẩy, trách nhiệm; phải đọc mạng Tứ Hóa.",
    "Hóa Khoa": "chuẩn hóa, học thức/danh tiếng, giảm ma sát trong một số cấu trúc; không phải cát tuyệt đối.",
    "Hóa Kỵ": "nút ma sát, ám ảnh, trì trệ/sai lệch hoặc nơi phải trả giá/chú ý; phải đọc mạng Tứ Hóa.",
  });

  const COMBO_RULES = Object.freeze([
    "Tử Phủ Vũ Tướng: quản trị/trật tự/tài nguyên/tổ chức; chỉ gọi thành cách khi hình học đúng SCHOOL.",
    "Sát Phá Tham: biến động, quyết liệt, tái cấu trúc, khai phá; không đồng nghĩa xấu.",
    "Cơ Nguyệt Đồng Lương: trí, điều phối, phục vụ, ổn định mềm; phải kiểm điều kiện thành lập.",
    "Cơ Cự / Cự Nhật / Cơ Lương: nhóm quan hệ chức năng; không nhảy thẳng sang phán nghề nghiệp.",
    "Lộc Mã / Khoa Quyền Lộc: chỉ mạnh khi nguồn Hóa, vị trí và hội tụ phù hợp; không đồng nghĩa giàu/sang chắc chắn.",
    "Xương Khúc / Khôi Việt / Tả Hữu / Quang Quý: nhóm trợ lực; không được đếm như điểm cộng cơ học.",
    "Không Kiếp / Kình Đà / Hỏa Linh / Hình Kỵ: nhóm áp lực/biến động; phải nói rõ phá cái gì, ở đâu, có cứu/chế không.",
  ]);

  const STRUCTURAL_RULES = `
QUY TẮC CẤU TRÚC HIEP TUVI:
- Ưu tiên: chính tinh + bộ sao chính → Tứ Hóa → trợ/sát tinh có sức cấu trúc → vòng sao → sao nhỏ.
- Mỗi chính tinh phải qua: cung/vị trí → thế đứng do engine cung cấp → đồng cung/hội chiếu → formation → Tứ Hóa → Tuần/Triệt → Ngũ Hành → Mệnh/Thân.
- Bộ sao phải xác định thành viên, hình học, sao lõi/modifier, cát-sát phá/cứu, Tứ Hóa và Tuần/Triệt; trạng thái complete/partial/broken.
- Tứ Hóa là mạng có hướng: source layer/can → carrier star → destination palace → geometry → tương tác bộ sao → net effect. Không trộn nguyên cục/đại hạn/lưu niên.
- Tuần/Triệt là bộ điều biến nhịp và tính liên tục, không phải nút xóa. Phải nói Triệt/Tuần đang tác động vào phần nào của cấu trúc và còn lại gì.
- Tràng Sinh là pha khí/nhịp phát triển: khởi phát → tăng trưởng → trưởng thành → cực thịnh → suy giảm → thu tàng/đứt pha → thai nghén/nuôi dưỡng. Tử/Tuyệt không phải tai họa chắc chắn; Đế Vượng không tự động đại cát.
- Mệnh–Thân: Mệnh → Mệnh–Tài–Quan → Mệnh–Di → cung Thân cư → tam phương/đối cung của Thân → Tứ Hóa nối Mệnh–Thân → đồng hướng/căng kéo.
- Tam phương tứ chính là lớp chính; nhị hợp và giáp cung là lớp bổ sung, không override tam phương mạnh nếu không có căn cứ SCHOOL.
`;

  const BAZI_RULES = `
QUY TẮC BÁT TỰ HIEP TUVI:
1) xác minh lịch/múi giờ/tiết khí; 2) bốn trụ; 3) Nhật chủ; 4) tháng lệnh/khí mùa; 5) vượng suy; 6) can chi; 7) hợp/xung/hình/hại/phá; 8) Thập Thần; 9) dụng/hỷ/kỵ chỉ khi phương pháp và evidence đủ; 10) đại vận; 11) sensitivity giờ sinh/tiết khí.
Không đếm số hành để kết luận vượng suy. Không “thiếu hành nào bổ hành đó”. Không dùng một quan hệ địa chi để khẳng định sự kiện. Không ép Bát Tự xác nhận Tử Vi; nếu hai hệ cùng dựa Ngũ Hành thì đánh dấu dependency.
`;

  const SYNTHESIS_RULES = `
QUY TẮC TỔNG HỢP:
- Quét Mệnh–Tài–Quan, Mệnh–Di, Phúc–Di–Phu, Quan–Phu, Phúc–Tài, Điền–Tật–Huynh, cung chứa Thân và chuỗi Tứ Hóa lặp.
- Chỉ giữ global theme khi sống sót qua contradiction check.
- Red-team phải kiểm: một sao=verdict, bỏ tam phương, formation thiếu điều kiện, trộn tầng Tứ Hóa/vận, trộn SCHOOL, cùng tiền đề bị đếm hai lần, Barnum/cherry-picking.
- Nếu bỏ toàn bộ huyền học, phần ACTION vẫn phải hợp lý theo dữ liệu và thực tiễn; huyền học chỉ là lớp phản tư.
`;

  function starNamesFromPalace(palace) {
    return (palace?.stars || []).map((star) => String(star?.saoTen || star?.name || "").trim()).filter(Boolean);
  }

  function findPalace(chart, name) {
    return (chart?.palaces || []).find((palace) => String(palace?.palace_name || "").toLocaleLowerCase("vi") === String(name).toLocaleLowerCase("vi"));
  }

  function knowledgeForPalaceJobs(chart, names) {
    const starNames = new Set();
    const palaceLines = [];
    for (const name of names || []) {
      const palace = findPalace(chart, name);
      palaceLines.push(`- ${name}: ${PALACE_THEMES[name] || "Đọc theo chức năng cung và toàn mạng liên đới."}`);
      for (const star of starNamesFromPalace(palace)) starNames.add(star);
    }
    const starLines = [...starNames]
      .filter((name) => STAR_RULES[name])
      .map((name) => `- ${name}: ${STAR_RULES[name]}`);
    return [
      "PHẠM VI CUNG:",
      ...palaceLines,
      "NATIVE MEANING CỦA SAO CÓ TRONG BATCH — chỉ là lớp nghĩa gốc, không phải verdict:",
      ...(starLines.length ? starLines : ["- Không có rule sao chuyên biệt trong knowledge pack; không được tự bịa rule mạnh."]),
      "BỘ SAO CẦN KIỂM TRA NẾU ĐỦ THÀNH VIÊN/HÌNH HỌC:",
      ...COMBO_RULES.map((line) => `- ${line}`),
      STRUCTURAL_RULES,
    ].join("\n");
  }

  function forJob(chart, job) {
    if (job?.kind === "palaces") return knowledgeForPalaceJobs(chart, job.palaces || []);
    if (job?.kind === "bazi") return BAZI_RULES;
    if (job?.kind === "synthesis") return `${STRUCTURAL_RULES}\n${BAZI_RULES}\n${SYNTHESIS_RULES}`;
    return STRUCTURAL_RULES;
  }

  root.HiepTuViKnowledge = Object.freeze({
    VERSION,
    PALACE_THEMES,
    STAR_RULES,
    forJob,
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
