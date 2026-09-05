# Hiep TuVi Knowledge Base V2

Thư mục này chứa **dữ liệu diễn giải cục bộ** cho Hiep TuVi AI. Đây không phải engine an sao. FACT/CALC luôn do `tuvi111` tính và khóa trước khi AI chạy.

## Module

- `stars.js`: 14 chính tinh + phụ/cát/sát/Tứ Hóa trọng yếu.
- `palaces.js`: 12 cung + tam hợp/đối cung/liên đới chủ đề.
- `combinations.js`: bộ sao/cách cục, điều kiện mạnh/yếu/phá/cứu.
- `structures.js`: Ngũ Hành, tam phương, Tứ Hóa, Tuần/Triệt, Tràng Sinh, Mệnh–Thân, vận và red-team.
- `bazi.js`: Bát Tự, Thập Thần, vượng suy và chống shortcut.
- `schools.js`: trường phái, provenance, confidence và claim states.

## Rule schema

Rule quan trọng nên có:

```text
id
subject/name/topic
conditions / must_check
exceptions
school
source
source_level
confidence
```

`source_level`: A/B/C/D theo provenance nội bộ của dự án. `confidence`: CORE/SUPPORTED/CONDITIONAL/DISPUTED/WEAK.

## Nguyên tắc sử dụng

1. Không đẩy toàn bộ KB vào model.
2. `hiep-tuvi-knowledge.js` chỉ truy xuất rule liên quan tới sao/cung/bộ sao của phần đang luận.
3. FACT/CALC của chart luôn ưu tiên hơn knowledge rule.
4. Không dùng một sao = một kết luận.
5. Không gọi cách cục nếu chưa kiểm hình học và trạng thái `complete/partial/broken`.
6. Không trộn nguyên cục/đại hạn/lưu niên.
7. Nếu rule khác trường phái, giữ SCHOOL riêng thay vì hòa trộn.

## Mở rộng

Khi thêm rule mới, thêm test cho ít nhất một trong các trường hợp:

- rule được truy xuất khi evidence phù hợp;
- rule không bị truy xuất khi evidence không liên quan;
- provenance/confidence tồn tại;
- knowledge pack vẫn nằm trong context budget của model local.
