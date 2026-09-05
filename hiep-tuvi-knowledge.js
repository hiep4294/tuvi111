"use strict";

(function initHiepTuViKnowledge(root) {
  const VERSION = "1.1.0";

  const PALACE_THEMES = Object.freeze({
    "Mệnh": "Nền biểu hiện cá nhân; bắt buộc nối Thân, Tài, Quan, Di.",
    "Phụ Mẫu": "Cha mẹ/người nuôi dưỡng, hỗ trợ thế hệ trước, quyền uy gia đình.",
    "Phúc Đức": "Nền gia tộc, đời sống tinh thần, sức bền tâm lý; không quy kết nghiệp như fact.",
    "Điền Trạch": "Tài sản cố định, không gian sống, nền vật chất, khả năng giữ/cải tổ.",
    "Quan Lộc": "Nghề/vai trò xã hội/phương thức làm việc; đọc với Mệnh–Tài và Phu Thê.",
    "Nô Bộc": "Đồng nghiệp, cấp dưới, đối tác, mạng hỗ trợ; không suy lòng trung thành tuyệt đối.",
    "Thiên Di": "Biểu hiện ngoài môi trường gốc, xã hội, di chuyển; đối cung trọng yếu của Mệnh.",
    "Tật Ách": "Điểm yếu, áp lực, rủi ro/sức khỏe theo ngôn ngữ truyền thống; không chẩn đoán.",
    "Tài Bạch": "Tạo, quản lý, lưu chuyển nguồn lực; đọc với Mệnh–Quan và Phúc Đức.",
    "Tử Tức": "Con cái/thế hệ sau/dự án tạo ra; không kết luận vô sinh hay giới tính thai nhi.",
    "Phu Thê": "Mẫu quan hệ đôi lứa; không khẳng định ngoại tình, ý định hay đạo đức người khác.",
    "Huynh Đệ": "Anh chị em/người ngang hàng gần, hỗ trợ và cạnh tranh trong gia đình.",
  });

  const STAR_RULES = Object.freeze({
    "Tử Vi": "điều phối, vị thế, quy tụ, trách nhiệm.",
    "Thiên Cơ": "tính toán, phương án, thay đổi, kỹ thuật, cơ biến.",
    "Thái Dương": "chủ động, biểu hiện công khai, danh tiếng/soi sáng.",
    "Vũ Khúc": "thực thi, tài chính, kỷ luật, định lượng, chịu áp lực.",
    "Thiên Đồng": "thích nghi, mềm dẻo, hưởng thụ/phúc khí, đổi theo hoàn cảnh.",
    "Liêm Trinh": "nguyên tắc, ranh giới, ham muốn, kiểm soát, cạnh tranh/quy phạm.",
    "Thiên Phủ": "tích trữ, quản trị, giữ nguồn lực, ổn định/bảo toàn.",
    "Thái Âm": "tài nguyên, tích lũy, nội tâm, quan sát, nuôi dưỡng.",
    "Tham Lang": "giao tế, thu hút, khai thác cơ hội, trải nghiệm/ham muốn.",
    "Cự Môn": "ngôn ngữ, tranh luận, nghi vấn, phân tích; thị phi chỉ khi cấu trúc bất lợi.",
    "Thiên Tướng": "hỗ trợ, điều phối, bảo hộ, quy trình/trung gian.",
    "Thiên Lương": "chuẩn mực, che chở, cứu giải, kinh nghiệm, độ bền.",
    "Thất Sát": "quyết đoán, áp lực, cắt bỏ, mạo hiểm có kiểm soát.",
    "Phá Quân": "phá cũ, tái cấu trúc, thử nghiệm, biến động, chi phí chuyển đổi.",
    "Tả Phù": "hỗ trợ/phối hợp; không phải điểm cộng cơ học.",
    "Hữu Bật": "hỗ trợ/phối hợp; không phải điểm cộng cơ học.",
    "Văn Xương": "học thuật/biểu đạt/văn bản; có thể tăng cả năng lực lẫn độ phức tạp.",
    "Văn Khúc": "học thuật/biểu đạt/nghệ thuật; có thể tăng cả năng lực lẫn độ phức tạp.",
    "Thiên Khôi": "cơ hội/quý nhân/được nhìn thấy theo quan niệm truyền thống.",
    "Thiên Việt": "cơ hội/quý nhân/được nâng đỡ theo quan niệm truyền thống.",
    "Ân Quang": "phúc trợ/cứu giải; không xóa toàn bộ cấu trúc bất lợi.",
    "Thiên Quý": "phúc trợ/cứu giải; không xóa toàn bộ cấu trúc bất lợi.",
    "Lộc Tồn": "tài nguyên, duy trì/tích lũy; phải xét cung và Tứ Hóa.",
    "Thiên Mã": "dịch chuyển/động lực/đổi môi trường; không tự động phát tài/đi xa.",
    "Đào Hoa": "sức hút/quan hệ/cảm xúc xã hội; không suy đạo đức/ngoại tình.",
    "Hồng Loan": "sức hút/quan hệ/cảm xúc xã hội; không suy đạo đức/ngoại tình.",
    "Thiên Hỷ": "hỷ khí/kết nối; là modifier theo cấu trúc.",
    "Thiên Diêu": "sức hút/cảm xúc; không dùng làm verdict quan hệ.",
    "Kình Dương": "cạnh tranh/cản lực trực diện; phải hỏi phá/chế cái gì.",
    "Đà La": "cản lực/trì kéo/ma sát; phải hỏi phá/chế cái gì.",
    "Hỏa Tinh": "bộc phát/tốc độ/nhiệt/biến đổi đột ngột theo hệ truyền thống.",
    "Linh Tinh": "bộc phát/tốc độ/nhiệt/biến đổi đột ngột theo hệ truyền thống.",
    "Địa Không": "đứt gãy/rỗng hụt/biến đổi mạnh; không đồng nghĩa tai họa chắc chắn.",
    "Địa Kiếp": "đứt gãy/rỗng hụt/biến đổi mạnh; không đồng nghĩa tai họa chắc chắn.",
    "Thiên Hình": "cắt/quy phạm/kỹ thuật/va chạm theo ngữ cảnh; không suy phạm tội.",
    "Hóa Lộc": "tăng nguồn lực/thu hút/lợi ích; phải đọc mạng nguồn→sao→cung.",
    "Hóa Quyền": "quyền tác động/kiểm soát/sức đẩy/trách nhiệm; đọc theo mạng Tứ Hóa.",
    "Hóa Khoa": "chuẩn hóa/học thức/danh tiếng/giảm ma sát; không phải cát tuyệt đối.",
    "Hóa Kỵ": "nút ma sát/ám ảnh/trì trệ/sai lệch; phải đọc mạng Tứ Hóa.",
  });

  const COMBOS = Object.freeze([
    { name: "Tử Phủ Vũ Tướng", members: ["Tử Vi", "Thiên Phủ", "Vũ Khúc", "Thiên Tướng"], min: 2, rule: "quản trị/trật tự/tài nguyên/tổ chức; chỉ gọi thành cách khi hình học đúng SCHOOL." },
    { name: "Sát Phá Tham", members: ["Thất Sát", "Phá Quân", "Tham Lang"], min: 2, rule: "biến động/quyết liệt/tái cấu trúc/khai phá; không đồng nghĩa xấu." },
    { name: "Cơ Nguyệt Đồng Lương", members: ["Thiên Cơ", "Thái Âm", "Thiên Đồng", "Thiên Lương"], min: 2, rule: "trí/điều phối/phục vụ/ổn định mềm; phải kiểm hình học." },
    { name: "Nhật Nguyệt", members: ["Thái Dương", "Thái Âm"], min: 2, rule: "đọc thế sáng-tối, vị trí, hội chiếu và cát-sát; không dùng tên bộ làm verdict." },
    { name: "Cơ Cự", members: ["Thiên Cơ", "Cự Môn"], min: 2, rule: "tính toán + ngôn ngữ/nghi vấn; phải xét cung, thế đứng, Hóa và sát/cát." },
    { name: "Cự Nhật", members: ["Cự Môn", "Thái Dương"], min: 2, rule: "biểu đạt/công khai/tranh luận; không nhảy thẳng sang nghề nghiệp/thị phi." },
    { name: "Cơ Lương", members: ["Thiên Cơ", "Thiên Lương"], min: 2, rule: "mưu lược + chuẩn mực/bền; kiểm hình học và Tứ Hóa." },
    { name: "Vũ Tham", members: ["Vũ Khúc", "Tham Lang"], min: 2, rule: "thực thi/tài nguyên + cơ hội/ham muốn; kiểm cung và cát-sát." },
    { name: "Liêm Tham", members: ["Liêm Trinh", "Tham Lang"], min: 2, rule: "ranh giới/kiểm soát + ham muốn/giao tế; phải xét chế hóa." },
    { name: "Liêm Sát", members: ["Liêm Trinh", "Thất Sát"], min: 2, rule: "quy phạm + quyết liệt/áp lực; không tự động xấu." },
    { name: "Khoa Quyền Lộc", members: ["Hóa Khoa", "Hóa Quyền", "Hóa Lộc"], min: 2, rule: "chỉ mạnh khi nguồn Hóa, vị trí và hội tụ đúng." },
    { name: "Lộc Mã", members: ["Lộc Tồn", "Hóa Lộc", "Thiên Mã"], min: 2, rule: "nguồn lực + động; không đồng nghĩa phát tài chắc chắn." },
    { name: "Xương Khúc", members: ["Văn Xương", "Văn Khúc"], min: 2, rule: "học thuật/biểu đạt; xem cát-sát và cung." },
    { name: "Khôi Việt", members: ["Thiên Khôi", "Thiên Việt"], min: 2, rule: "cơ hội/quý nhân; không xóa cấu trúc yếu." },
    { name: "Tả Hữu", members: ["Tả Phù", "Hữu Bật"], min: 2, rule: "trợ lực/phối hợp; phụ thuộc cấu trúc chính." },
    { name: "Không Kiếp", members: ["Địa Không", "Địa Kiếp"], min: 2, rule: "đứt gãy/biến đổi; hỏi phá cái gì, có cứu/chế không." },
    { name: "Kình Đà", members: ["Kình Dương", "Đà La"], min: 2, rule: "áp lực trực diện + trì kéo; đọc theo node bị tác động." },
    { name: "Hỏa Linh", members: ["Hỏa Tinh", "Linh Tinh"], min: 2, rule: "bộc phát/tốc độ; kiểm nơi kích hoạt và khả năng chế hóa." },
    { name: "Hình Kỵ", members: ["Thiên Hình", "Hóa Kỵ"], min: 2, rule: "quy phạm/cắt + ma sát; không suy phạm tội/tai họa chắc chắn." },
  ]);

  const STRUCTURAL_RULES = `CẤU TRÚC: ưu tiên chính tinh+bộ sao→Tứ Hóa→trợ/sát cấu trúc→vòng sao→sao nhỏ. Formation kiểm thành viên+hình học+cát/sát+Hóa+Tuần/Triệt và ghi complete/partial/broken. Tứ Hóa đọc source→carrier→cung→geometry→net effect, không trộn tầng. Tuần/Triệt là modifier nhịp/liên tục, không xóa sao. Tràng Sinh là pha khí: Tử/Tuyệt≠tai họa, Đế Vượng≠đại cát. Mệnh–Thân: Mệnh→Tài/Quan→Di→cung Thân→tam phương/đối cung Thân→Tứ Hóa nối. Tam phương là lớp chính; nhị hợp/giáp là bổ sung.`;
  const BAZI_RULES = `BÁT TỰ: 4 trụ→Nhật chủ→tháng lệnh/khí mùa→vượng suy→can chi→hợp/xung/hình/hại/phá→Thập Thần→dụng/hỷ/kỵ khi đủ evidence→đại vận→sensitivity giờ/tiết khí. Không đếm số hành để phán vượng suy; không “thiếu gì bổ nấy”; không ép Bát Tự xác nhận Tử Vi; đồng thuận dùng chung Ngũ Hành phải đánh dấu dependency.`;
  const SYNTHESIS_RULES = `TỔNG HỢP: quét Mệnh–Tài–Quan, Mệnh–Di, Phúc–Di–Phu, Quan–Phu, Phúc–Tài, Điền–Tật–Huynh, cung Thân và chuỗi Tứ Hóa lặp. Chỉ giữ theme sống sót contradiction check. Red-team: một sao=verdict, bỏ tam phương, formation thiếu điều kiện, trộn tầng/SCHOOL, cùng tiền đề đếm hai lần, Barnum/cherry-picking. ACTION phải hữu ích ngay cả khi bỏ lớp huyền học.`;

  function clip(text, max = 3800) {
    const value = String(text || "");
    return value.length <= max ? value : `${value.slice(0, max - 16)}...[rút gọn]`;
  }

  function addDetailNames(set, items) {
    for (const item of items || []) {
      const name = String(item?.saoTen || item?.name || item?.label || "").trim();
      if (name) set.add(name);
    }
  }

  function findPalace(chart, name) {
    const target = String(name || "").toLocaleLowerCase("vi");
    return (chart?.palaces || []).find((p) => String(p?.palace_name || "").toLocaleLowerCase("vi") === target) || null;
  }

  function collectRelevantStars(chart, names) {
    const set = new Set();
    for (const name of names || []) {
      const palace = findPalace(chart, name);
      for (const star of palace?.stars || []) {
        const n = String(star?.saoTen || star?.name || "").trim();
        if (n) set.add(n);
      }
      const rel = chart?.relations?.[String(palace?.branch_id)] || chart?.palace_relations?.[String(palace?.branch_id)];
      const nodes = [rel?.self, rel?.opposite, ...(rel?.trine || []), ...(rel?.adjacent || []), rel?.six_harmony].filter(Boolean);
      for (const node of nodes) {
        addDetailNames(set, node.major_star_details);
        addDetailNames(set, node.good_star_details);
        addDetailNames(set, node.bad_star_details);
        addDetailNames(set, node.transformation_details);
      }
    }
    return set;
  }

  function relevantCombos(starSet) {
    return COMBOS.filter((combo) => combo.members.filter((member) => starSet.has(member)).length >= combo.min);
  }

  function knowledgeForPalaces(chart, names) {
    const stars = collectRelevantStars(chart, names);
    const themes = (names || []).map((name) => `- ${name}: ${PALACE_THEMES[name] || "đọc theo chức năng cung và mạng liên đới"}`);
    const starLines = [...stars].filter((name) => STAR_RULES[name]).map((name) => `- ${name}: ${STAR_RULES[name]}`);
    const comboLines = relevantCombos(stars).map((combo) => `- ${combo.name}: ${combo.rule}`);
    return clip([
      "PHẠM VI:", ...themes,
      "NATIVE MEANING — chỉ là nghĩa gốc, không phải verdict:", ...(starLines.length ? starLines : ["- Không có rule sao chuyên biệt; hạ confidence, không bịa."]),
      ...(comboLines.length ? ["BỘ SAO CẦN KIỂM TRA HÌNH HỌC:", ...comboLines] : []),
      STRUCTURAL_RULES,
    ].join("\n"), 3800);
  }

  function forJob(chart, job) {
    if (job?.kind === "palaces") return knowledgeForPalaces(chart, job.palaces || []);
    if (job?.kind === "bazi") return BAZI_RULES;
    if (job?.kind === "synthesis") return clip(`${STRUCTURAL_RULES}\n${BAZI_RULES}\n${SYNTHESIS_RULES}`, 3000);
    return STRUCTURAL_RULES;
  }

  root.HiepTuViKnowledge = Object.freeze({ VERSION, PALACE_THEMES, STAR_RULES, COMBOS, forJob });
})(typeof globalThis !== "undefined" ? globalThis : this);
