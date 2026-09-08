# Hiep TuVi 0.6B — browser experiment

Mục tiêu: kiểm tra Qwen3-0.6B ONNX làm bộ diễn giải chuyên ngành Tử Vi/Bát Tự trên FACT/CALC đã khóa bởi tuvi111.

Nguyên tắc:
- Không thay engine an sao/Bát Tự.
- Không chạy tự động; chỉ chạy khi người dùng bấm nút thử nghiệm.
- Mỗi lần chỉ luận **một cung đang chọn** để đo chất lượng, tốc độ và độ ổn định trước khi mở rộng đủ 12 cung.
- Knowledge Base V2 được truy xuất theo đúng cung/sao liên quan rồi mới đưa cho model.
- Qwen3 thinking bị tắt bằng `/no_think` để giảm token, RAM và thời gian.
- Model: `onnx-community/Qwen3-0.6B-ONNX`, Transformers.js, WebGPU, `q4f16`.
- Nếu WebGPU/driver không hỗ trợ thì thí nghiệm thất bại có kiểm soát; Local Rules hiện tại không bị ảnh hưởng.

Tiêu chí thử:
1. Trang không crash.
2. Model tải và sinh được kết quả trên cung đang chọn.
3. Prompt không vượt 9.000 ký tự.
4. Output mục tiêu 180–320 từ, có cơ chế A + B + modifier C, không chỉ liệt kê từ khóa.
5. Không tự an lại sao hoặc thay FACT/CALC.
6. Có nút unload model để giải phóng GPU/RAM.
