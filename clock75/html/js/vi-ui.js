/* Vietnamese presentation layer. Original Bluetooth/resource/DFU engines are
 * deliberately unchanged: protocol errors and retry matching retain original text.
 * Never translates editable values, JSON, command bytes, scripts or CSS.
 */
(function (root) {
  'use strict';
  const entries = `
设备未接受传图复位|Thiết bị chưa nhận lệnh bắt đầu phiên truyền ảnh
传图已取消：蓝牙连接已变化|Đã hủy truyền ảnh vì kết nối Bluetooth thay đổi
MTU过小|MTU quá nhỏ
块，超过512上限|khối, vượt giới hạn 512
”暂不支持，请使用基本平面的文字，避免控制字符或表情|” chưa được hỗ trợ. Hãy dùng chữ thông thường, không dùng emoji hoặc ký tự điều khiển.
请先连接设备，再读取或保存日期标注。|Kết nối thiết bị trước khi đọc hoặc lưu đánh dấu ngày.
当日日期下方是红色背景，请不要选择红色；建议改用白色或黑色。|Ngày hiện tại có nền đỏ. Hãy chọn chữ trắng hoặc đen thay vì đỏ.
标签显示在右上角，节日 / 农历仍保留。|Nhãn ở góc trên bên phải; vẫn giữ ngày lễ và âm lịch bên dưới.
标签替换日期下方的节日 / 农历，并显示红点。|Nhãn thay dòng ngày lễ/âm lịch bên dưới ngày và hiện thêm chấm đỏ.
含英文字母时，设备使用小字号显示。|Nhãn có chữ Latin sẽ hiển thị bằng cỡ nhỏ.
当日红字会与红色背景重合，请改用白色或黑色。|Chữ đỏ trùng nền đỏ của ngày hiện tại. Hãy dùng trắng hoặc đen.
白字在浅色背景上可能不易辨认。|Chữ trắng có thể khó đọc trên nền sáng.
更新标注|Cập nhật đánh dấu
该日期已有标注，将更新其内容；原日期|Ngày này đã có đánh dấu và sẽ được cập nhật; ngày cũ
修改日期会新增标注，原日期|Đổi ngày sẽ thêm đánh dấu mới; ngày cũ
更新当前日期的本地标注，保存到设备后生效。|Đã sửa đánh dấu trong bản nháp; lưu vào thiết bị để áp dụng.
仅红点|Chỉ chấm đỏ
的标注|đánh dấu ngày
请选择 2000–2099 年内的有效日期。|Hãy chọn ngày hợp lệ trong khoảng 2000–2099.
请完成标签输入后再添加标注。|Hãy nhập nhãn xong trước khi thêm đánh dấu.
条日期标注，可编辑或移除已有日期。|đánh dấu ngày; có thể sửa hoặc xóa các ngày đã có.
添加|Thêm
已|Đã
的本地标注，保存到设备后生效。|trong bản nháp; lưu vào thiết bị để áp dụng.
已移除|Đã xóa
已取消本次编辑，列表内容保持不变。|Đã hủy sửa; danh sách không thay đổi.
标注数据太短|Dữ liệu đánh dấu quá ngắn
标注数据无效|Dữ liệu đánh dấu không hợp lệ
标注条数无效|Số đánh dấu không hợp lệ
标注标签过长|Nhãn đánh dấu quá dài
当前固件不支持回读标注，请升级到 0x29 或更高|Phần mềm chưa hỗ trợ đọc đánh dấu; cần phiên bản 0x29 trở lên
请求回读失败|Không gửi được yêu cầu đọc lại
已从设备读回|Đã đọc từ thiết bị
回读超时或数据无效|Đọc lại quá thời gian hoặc dữ liệu không hợp lệ
当前固件不支持右上角标注，请升级到 0x2A 或更高，或把位置改回日期下方|Phần mềm chưa hỗ trợ nhãn góc trên phải. Cần phiên bản 0x2A trở lên hoặc chuyển nhãn xuống dưới ngày.
个字模并加载到设备|ký tự và nạp vào thiết bị
标注分片发送失败|Gửi khối đánh dấu thất bại
设备未确认标注已写入外置 Flash，请重试|Thiết bị chưa xác nhận lưu đánh dấu vào flash ngoài. Hãy thử lại.
条日期标注到外置 Flash|đánh dấu ngày vào flash ngoài
已下发|Đã gửi
保存后回读失败，请再读一次核对|Đã lưu nhưng không đọc lại được. Hãy đọc lại để đối chiếu.
设备未确认清除结果已写入外置 Flash，请重试|Thiết bị chưa xác nhận lưu kết quả xóa vào flash ngoài. Hãy thử lại.
已清除设备标注并写入外置 Flash|Đã xóa đánh dấu và lưu vào flash ngoài
已清除设备标注|Đã xóa đánh dấu trên thiết bị
正在初始化设备|Đang khởi tạo thiết bị
正在传送图片|Đang truyền ảnh
正在切换显示模式|Đang chuyển chế độ hiển thị
正在导出设备备份|Đang xuất bản sao lưu thiết bị
裁剪模式: 可用鼠标滚轮或双指触摸缩放图片|Cắt ảnh: dùng con lăn chuột hoặc hai ngón tay để phóng to, thu nhỏ
图片裁剪失败，请重新选择图片。|Cắt ảnh thất bại. Hãy chọn lại ảnh.
未找到 manifest.json，固件包格式不正确|Không tìm thấy manifest.json; gói cập nhật sai định dạng
manifest.json 缺少 manifest 字段|manifest.json thiếu trường manifest
获取DFU服务超时|Hết thời gian chờ dịch vụ DFU
获取DFU特征超时|Hết thời gian chờ đặc tính DFU
连接或服务发现尚未稳定，等待后重试（第|Kết nối hoặc dịch vụ chưa ổn định, đợi rồi thử lại (lần
正在自动查找 DFU 设备|Đang tự tìm thiết bị DFU
提示: 若设备是 unbonded buttonless DFU，切换到 Bootloader 后 MAC 地址可能会变化。根据浏览器安全策略，网页必须再次通过设备选择框授权该新设备。若您以前升级时已选择过此 DfuTarg 并授权，浏览器才可自动识别。|Lưu ý: địa chỉ Bluetooth có thể thay đổi khi vào bộ nạp DFU. Trình duyệt có thể yêu cầu chọn và cấp quyền lại cho DfuTarg; chỉ tự nhận diện được nếu trước đó trang đã được cấp quyền.
配置PRN失败，继续使用默认行为|Không đặt được PRN; tiếp tục với thiết lập mặc định
字节兼容分片进行传输|byte mỗi khối trong chế độ truyền tương thích
GATT 操作进行中，等待 50ms 并重试（第|GATT đang bận; đợi 50 ms rồi thử lại (lần
writeWithoutResponse 不稳定，切换到 writeValue 模式|writeWithoutResponse không ổn định; chuyển sang writeValue
分片大小|Kích thước khối
写入失败，回退到|ghi thất bại, chuyển về
PRN 等待异常，禁用后续 PRN 流控并回退到兼容模式|Lỗi chờ PRN; tắt kiểm soát PRN cho phần còn lại và dùng chế độ tương thích
应用态未发现DFU服务，尝试在应用服务中查找Buttonless特征|Không thấy dịch vụ DFU; thử tìm lệnh vào DFU trong dịch vụ ứng dụng
设备已处于 DFU 模式，跳过切换|Thiết bị đã ở DFU, không cần chuyển chế độ
首轮高速传输未稳定，切换到兼容模式（delay=10ms）后重试|Truyền nhanh chưa ổn định; thử lại với chế độ tương thích, chờ 10 ms mỗi khối
安全上下文(HTTPS/localhost)|Môi trường an toàn (HTTPS/localhost)
离线ZIP解压(DecompressionStream)|Giải nén ZIP ngoại tuyến (DecompressionStream)
支持|Có hỗ trợ
requestDevice 接口|Giao diện chọn thiết bị requestDevice
系统蓝牙可用性|Bluetooth hệ thống
不可用/已关闭|Không khả dụng hoặc đang tắt
检测失败|Kiểm tra thất bại
浏览器不支持 getAvailability，跳过|Trình duyệt không hỗ trợ getAvailability; bỏ qua bước này
设备操作已取消或连接已变化|Thao tác đã hủy hoặc kết nối đã thay đổi
旧版待办缓存暂未备份，画布缓存保持原样。请到待办事项工作区导入并导出备份。|Chưa sao lưu danh sách cũ; vẫn giữ bản nháp ảnh. Hãy vào Việc cần làm để nhập và xuất bản sao.
当前画布可继续编辑；浏览器缓存空间不足，请及时保存图片。|Vẫn có thể chỉnh ảnh nhưng bộ nhớ trình duyệt sắp đầy. Hãy lưu ảnh sớm.
待办已移至“待办事项”工作区。|Danh sách đã chuyển sang mục “Việc cần làm”.
按住并拖动绘画；轻点画布可画圆点。|Giữ và kéo để vẽ; chạm một lần để vẽ chấm.
按住并拖动擦为白色，画笔颜色和粗细会保留。|Giữ và kéo để tẩy về trắng. Vẫn giữ màu và độ dày của bút.
输入文字后点击画布放置；点击已有文字可编辑，拖动可调整位置。|Nhập chữ rồi bấm lên ảnh để đặt; bấm chữ có sẵn để sửa, kéo để đổi vị trí.
每行输入一项，点击画布放置整组；点击方框切换完成状态，拖动文字调整位置。|Mỗi dòng một việc; bấm lên ảnh để đặt cả nhóm. Bấm ô vuông để đánh dấu hoàn tất, kéo chữ để đổi vị trí.
创建课表后点击单元格编辑，可批量填入课程。|Tạo thời khóa biểu rồi bấm từng ô để sửa, hoặc dán nhiều tiết cùng lúc.
待办清单|Danh sách công việc
橡皮|Tẩy
请输入文字内容，可使用换行排版。|Hãy nhập nội dung chữ; có thể xuống dòng để căn bố cục.
点击画布放置文字；取消可返回编辑。|Bấm lên ảnh để đặt chữ; hủy để quay lại chỉnh sửa.
已选中文字，可修改内容或拖动位置。|Đã chọn chữ. Có thể sửa nội dung hoặc kéo đổi vị trí.
文字内容不能为空；需要移除时请点击删除。|Nội dung không được trống. Muốn bỏ chữ, hãy bấm Xóa.
文字已更新。|Đã cập nhật chữ.
已删除选中文字。|Đã xóa chữ đã chọn.
文字超出画布，请减小字号、行距或使用换行排版。|Chữ vượt khung ảnh. Hãy giảm cỡ chữ, giãn dòng hoặc xuống dòng.
文字已放置，可拖动或继续编辑。|Đã đặt chữ. Có thể kéo hoặc tiếp tục chỉnh sửa.
请输入待办内容，每行一项。|Hãy nhập việc cần làm, mỗi dòng một việc.
编辑单项待办时请保留一行；取消编辑后可批量添加。|Khi sửa một việc chỉ giữ một dòng. Hủy sửa để thêm nhiều việc.
待办已更新。|Đã cập nhật công việc.
点击画布放置|Bấm lên ảnh để đặt
项待办；每项方框可切换完成状态。|việc; bấm ô vuông từng việc để đổi trạng thái hoàn tất.
待办内容超出画布宽度，请减小字号或缩短单项内容。|Nội dung rộng hơn ảnh. Hãy giảm cỡ chữ hoặc rút ngắn từng việc.
剩余高度不足以放下清单，请减小字号、行距或选择更靠上的位置。|Không đủ chiều cao để đặt danh sách. Giảm cỡ chữ, giãn dòng hoặc đặt cao hơn.
已添加|Đã thêm
已选中待办，可修改内容和样式。|Đã chọn công việc. Có thể sửa nội dung và kiểu chữ.
已删除待办。|Đã xóa công việc.
没有已完成的待办。|Không có việc đã hoàn tất.
已清理|Đã dọn
画布高度不足，请减小行距或将第一项向上移动。|Ảnh không đủ cao. Giảm giãn dòng hoặc kéo việc đầu tiên lên trên.
待办已按当前顺序对齐。|Đã căn các việc theo thứ tự hiện tại.
每行输入一项，批量放置清单；也可在这里编辑、排序与勾选完成。|Mỗi dòng một việc để đặt cả danh sách. Có thể sửa, sắp xếp và đánh dấu hoàn tất tại đây.
项待办内容|nội dung công việc
待办内容不能为空；可使用删除按钮移除。|Nội dung công việc không được trống; bấm Xóa để bỏ việc.
点击课表单元格编辑课程|Bấm ô thời khóa biểu để sửa môn học
尺寸已修改，点击“更新课表”应用并保留已有课程。|Đã đổi kích thước. Bấm “Cập nhật thời khóa biểu” để áp dụng và giữ các môn đã nhập.
节次|Tiết
节|tiết
课表已生成，点击单元格填写课程。|Đã tạo thời khóa biểu. Bấm từng ô để nhập môn học.
课表已更新，重叠区域的课程已保留。|Đã cập nhật thời khóa biểu, giữ nội dung các ô còn tồn tại.
课表已适配当前画布。|Đã căn thời khóa biểu theo khung ảnh.
课程内容已保存。|Đã lưu môn học.
课程已清空，标题和表格设置已保留。|Đã xóa môn học, vẫn giữ tiêu đề và thiết lập bảng.
课表已移除，可撤销恢复。|Đã xóa thời khóa biểu; có thể Hoàn tác để khôi phục.
历史|Lịch sử
自习|Tự học
已填入示例课程，可点击单元格替换。|Đã điền môn học mẫu. Bấm từng ô để thay nội dung.
行课程，粘贴区域之外的课程已保留。|dòng môn học; các ô ngoài vùng dán được giữ nguyên.
格|ô
点击单元格编辑课程；文字会自动换行、适配格子。|Bấm ô để sửa môn học; chữ tự xuống dòng cho vừa ô.
节次表头|Tiêu đề cột tiết
星期表头|Tiêu đề các ngày
节次标签|Nhãn tiết
课表本地缓存保存失败|Không lưu được bản nháp thời khóa biểu
课表本地缓存读取失败|Không đọc được bản nháp thời khóa biểu
课表本地缓存清除失败|Không xóa được bản nháp thời khóa biểu
待办字体类型必须是字体名称|Loại phông công việc phải là tên phông
待办字体名称无效，请选择列表中的字体|Tên phông không hợp lệ. Hãy chọn trong danh sách.
待办内容必须是文字|Nội dung công việc phải là văn bản
请填写待办事项|Hãy nhập việc cần làm
暂不支持不可见格式字符，请使用基本平面文字|Chưa hỗ trợ ký tự định dạng ẩn. Hãy dùng chữ thông thường.
每项最多 64 个 UTF-8 字节（中文通常最多 21 字）|Mỗi việc tối đa 64 byte UTF-8; số ký tự tùy dấu tiếng Việt
暂不支持表情、扩展平面文字或控制字符，请使用基本平面文字|Chưa hỗ trợ emoji, chữ ngoài BMP hoặc ký tự điều khiển. Hãy dùng chữ thông thường.
时间超出设备支持范围|Thời gian vượt phạm vi thiết bị hỗ trợ
请填写完整的触发时间和截止时间|Hãy nhập đủ giờ bắt đầu và hạn chót
日期范围为 2000 至 2099 年|Ngày phải nằm trong khoảng năm 2000–2099
时间或日期无效|Ngày hoặc giờ không hợp lệ
待办记录格式无效|Bản ghi công việc sai định dạng
待办 ID 无效|ID công việc không hợp lệ
待办状态无效|Trạng thái công việc không hợp lệ
截止时间必须晚于触发时间|Hạn chót phải sau giờ bắt đầu
待办配置格式无效|Cấu hình công việc sai định dạng
屏幕显示数量应为 1 至 8|Số việc hiển thị phải từ 1 đến 8
待办字号应为 9、12、16、20、24 或 32|Cỡ chữ phải là 9, 12, 16, 20, 24 hoặc 32
待办字形设置应为开关|Thiết lập kiểu chữ phải là bật hoặc tắt
显示提前时间和过期保留时间应为 0 至 1440 分钟|Thời gian hiện trước và giữ sau hạn phải từ 0 đến 1440 phút
项，请减少屏幕显示数量|việc; hãy giảm số việc hiển thị
待办 ID 重复|ID công việc bị trùng
设备温度|Nhiệt độ thiết bị
摄氏度|độ C
待办数据不完整|Dữ liệu công việc chưa đầy đủ
待办数据版本或格式无效|Phiên bản hoặc định dạng dữ liệu công việc không hợp lệ
待办数据长度或保留字段无效|Độ dài hoặc trường dự phòng dữ liệu công việc không hợp lệ
待办记录状态或文字长度无效|Trạng thái hoặc độ dài chữ của bản ghi công việc không hợp lệ
常驻待办时间应为零|Công việc luôn hiển thị phải có thời gian bằng 0
待办文字格式无效|Chữ của công việc sai định dạng
待办字形版本与设置不符|Phiên bản kiểu chữ không khớp thiết lập
待办字形缺少专用字库|Thiếu bộ chữ riêng cho kiểu chữ công việc
待办字体类型与字库设置不符|Loại phông không khớp thiết lập bộ chữ
待办字体名称或标识无效|Tên hoặc mã phông công việc không hợp lệ
浏览器无法保存本地草稿，请导出备份；设备保存仍可使用。|Trình duyệt không lưu được bản nháp. Hãy xuất bản sao; vẫn có thể lưu vào thiết bị.
草稿版本无效|Phiên bản bản nháp không hợp lệ
本地草稿未加载|Chưa nạp bản nháp
请先完成事项文字输入|Hãy nhập xong nội dung công việc trước
最多保存 32 条待办事项，请删除不再需要的事项|Tối đa 32 việc. Hãy xóa việc không còn cần thiết.
事项已更新到本地草稿，保存到设备后生效。|Đã cập nhật bản nháp. Lưu vào thiết bị để áp dụng.
项，屏幕显示数量已调整为|việc; số việc hiển thị được đổi thành
表单中的事项尚未加入清单，请先点击“添加事项”或“更新事项”，再保存或导出。|Công việc đang nhập chưa có trong danh sách. Bấm “Thêm công việc” hoặc “Cập nhật công việc” trước khi lưu hoặc xuất.
启用全屏待办|Bật việc cần làm toàn màn
设备模式模块未加载，请刷新页面。|Chưa nạp mô-đun chế độ thiết bị. Hãy tải lại trang.
旧版待办内容必须是文字|Nội dung danh sách cũ phải là văn bản
旧版待办内容为空|Danh sách cũ trống
旧版待办含无法无损拆分的长空白内容，旧草稿仍保留，请精简后重试|Danh sách cũ chứa khoảng trắng quá dài không thể chia an toàn. Vẫn giữ bản nháp cũ; hãy rút gọn rồi thử lại.
单条旧版待办拆分后超过 32 项，旧草稿仍保留，请精简后重试|Một việc cũ sau khi chia vượt 32 việc. Vẫn giữ bản nháp cũ; hãy rút gọn rồi thử lại.
此浏览器没有可导入的旧版待办草稿。|Trình duyệt không có bản nháp công việc cũ để nhập.
旧版待办需|Danh sách cũ cần
个事项，导入后超过 32 条；当前清单和旧版草稿均已保留，请先减少事项后重试。|việc, khi nhập sẽ vượt 32 việc. Vẫn giữ danh sách và bản nháp cũ; hãy giảm số việc rồi thử lại.
（长内容已拆分）|(nội dung dài đã được chia nhỏ)
条旧版待办，共|việc cũ, tổng cộng
项常驻事项|việc luôn hiển thị
取消常驻显示后可设置触发和截止时间，再保存到设备。|Tắt Luôn hiển thị để đặt giờ bắt đầu và hạn chót, sau đó lưu vào thiết bị.
待办备份版本无效|Phiên bản bản sao công việc không hợp lệ
条待办到本地草稿，请保存到设备。|việc vào bản nháp. Hãy lưu vào thiết bị.
请先连接设备，再读取或保存待办事项。|Kết nối thiết bị trước khi đọc hoặc lưu công việc.
待办事项需要 0x3A 或更新的固件，请先升级。|Việc cần làm yêu cầu phần mềm 0x3A trở lên. Hãy cập nhật trước.
待办资源模块未加载，请刷新页面。|Chưa nạp mô-đun dữ liệu công việc. Hãy tải lại trang.
新的待办显示规则需要固件 0x3D 或更新版本，请先升级设备；仍可读取设备原有待办。|Quy tắc hiển thị mới cần phần mềm 0x3D trở lên. Hãy cập nhật thiết bị; vẫn có thể đọc danh sách cũ.
正在保存待办事项并检查设备字库|Đang lưu công việc và kiểm tra bộ chữ trên thiết bị
条待办到设备，触发与截止时间将在离线状态下生效。|việc vào thiết bị. Giờ bắt đầu và hạn chót vẫn có hiệu lực khi không kết nối web.
本次待办已保存到设备；本地还有新修改，请再次保存。|Đã lưu công việc nhưng bản nháp có chỉnh sửa mới. Hãy lưu lại.
读取期间本地草稿已修改，请再次读取以替换草稿|Bản nháp đã đổi trong lúc đọc. Đọc lại nếu muốn thay bản nháp.
已从设备读取|Đã đọc từ thiết bị
未触发 · 未到提前显示时间|Chưa đến giờ · Chưa đến thời điểm hiện trước
已过期 · 已隐藏|Đã hết hạn · Đã ẩn
提前显示 · 未触发|Hiện trước · Chưa đến giờ
已触发 · 正在显示|Đã đến giờ · Đang hiển thị
常驻 · 完成后隐藏|Luôn hiển thị · Ẩn khi hoàn tất
常驻|Luôn hiển thị
待办备份文件过大|Tệp sao lưu công việc quá lớn
读取备份期间草稿已修改，请重新选择备份以替换草稿|Bản nháp đổi trong lúc đọc bản sao. Hãy chọn lại bản sao nếu muốn thay bản nháp.
直径|đường kính
像素|px
当天未完成待办总数|Tổng việc chưa hoàn thành trong ngày
设备版本: 当前页未读取（仅校验包版本）|Phiên bản thiết bị: trang này chưa đọc, chỉ kiểm tra phiên bản trong gói
包内应用版本: 未解析|Phiên bản ứng dụng trong gói: chưa phân tích
包内应用版本(推测)|Phiên bản ứng dụng trong gói (ước tính)
起始 0x|bắt đầu 0x
错误: 应用镜像超过工程配置应用区上限，当前MCU无法容纳该固件|Lỗi: phần mềm vượt vùng ứng dụng, chip không đủ bộ nhớ để chứa
基础镜像|Ảnh chương trình cơ sở
提示: 该镜像已接近/超过当前工程常见可用 DFU 缓存估算|Lưu ý: ảnh chương trình gần hoặc vượt dung lượng đệm DFU ước tính
能否放下还取决于设备当前固件实际占用|khả năng chứa còn tùy dung lượng phần mềm hiện tại trên thiết bị
提示: 组合包是否能放下仍取决于设备当前固件实际占用，网页只能做近似预检查|Lưu ý: khả năng chứa gói kết hợp còn tùy phần mềm hiện tại. Trang web chỉ kiểm tra gần đúng.
预警: 包版本低于设备版本，可能被Bootloader拒绝(疑似降级)|Cảnh báo: phiên bản gói thấp hơn thiết bị, bộ nạp có thể từ chối hạ cấp
手动接管按钮已强制显示|Đã hiện nút tiếp tục thủ công
浏览器不支持离线ZIP解压(DecompressionStream缺失)|Trình duyệt không hỗ trợ giải nén ZIP ngoại tuyến (thiếu DecompressionStream)
ZIP本地头校验失败|Phần đầu tệp ZIP không hợp lệ
未找到ZIP中央目录|Không tìm thấy danh mục trung tâm của ZIP
ZIP压缩方法不支持|Không hỗ trợ phương thức nén ZIP
正在解析固件包|Đang đọc gói cập nhật
正在升级|Đang cập nhật
复用当前已连接应用设备|Dùng thiết bị đang kết nối
请在弹窗中选择应用设备|Chọn thiết bị đang chạy trong hộp thoại
未检测到现有连接，按官方 unbonded buttonless DFU 流程选择应用设备|Chưa có kết nối. Chọn thiết bị đang chạy theo quy trình DFU chính thức của Nordic.
请在弹窗中选择 DFU 设备（如 DfuTarg）|Chọn thiết bị DFU trong hộp thoại, ví dụ DfuTarg
等待用户选择 DfuTarg/DFU Bootloader 设备；为兼容部分浏览器，这里会显示全部蓝牙设备|Đợi chọn DfuTarg hoặc bộ nạp DFU. Để tương thích trình duyệt, danh sách sẽ hiện tất cả thiết bị Bluetooth.
名称符合 DFU Bootloader，先执行一次宽松预校验|tên phù hợp với bộ nạp DFU, đang kiểm tra sơ bộ
名称符合|Tên phù hợp
但预校验未稳定通过；仍将继续尝试正式 DFU 连接|nhưng kiểm tra sơ bộ chưa ổn định; sẽ thử kết nối DFU chính thức
名称不像 DfuTarg，正在校验其是否为 DFU Bootloader|tên không giống DfuTarg; đang kiểm tra dịch vụ bộ nạp DFU
校验|Kiểm tra
不是可连接的 DFU Bootloader（第|không phải bộ nạp DFU có thể kết nối (lần
所选设备|Thiết bị đã chọn
不是 DFU Bootloader，请选择 DfuTarg 后重试|không phải bộ nạp DFU. Hãy chọn DfuTarg rồi thử lại.
DFU 设备选择仍可继续|Vẫn có thể tiếp tục chọn thiết bị DFU
请选择名称为 DfuTarg 的 DFU 设备后重试|Hãy chọn thiết bị DFU có tên DfuTarg rồi thử lại
请先让设备进入 DfuTarg，再在弹窗中选择 DFU 设备|Đưa thiết bị vào DfuTarg trước, sau đó chọn thiết bị DFU trong hộp thoại
当前会话已切换为“手动进入 DFU 模式”流程，直接选择 DfuTarg|Đã chuyển sang vào DFU thủ công. Hãy chọn trực tiếp DfuTarg.
正在查找已授权 DFU 设备（|Đang tìm thiết bị DFU đã được cấp quyền (
尝试在当前网页已授权的设备中查找 DFU 目标（|Tìm thiết bị DFU trong danh sách được cấp quyền cho trang này (
正在等待 DfuTarg 出现（|Đang đợi DfuTarg xuất hiện (
秒）... 如果系统里已显示“已配对”，但当前网页还未授权该 DfuTarg，稍后仍可能需要你手动再选一次。|giây)... Dù hệ thống đã ghép đôi, bạn vẫn có thể phải chọn lại DfuTarg để cấp quyền cho trang web.
已配置关闭自动识别 DFU 设备，直接弹出设备选择框|Đã tắt tự nhận diện DFU; mở hộp chọn thiết bị
系统可能已经配对 DfuTarg，但当前网页尚未获得该设备授权，请点击“手动选择DFU设备并继续”并重新选择 DfuTarg|Hệ thống có thể đã ghép đôi DfuTarg nhưng trang web chưa được cấp quyền. Bấm “Chọn thiết bị DFU thủ công và tiếp tục” rồi chọn lại DfuTarg.
正在等待设备重启，准备继续升级|Đợi thiết bị khởi động lại để tiếp tục cập nhật
当前镜像已完成，准备重新连接 DFU 设备继续|Đã xong ảnh chương trình hiện tại. Chuẩn bị kết nối lại DFU để tiếp tục
检测到未完成的 DFU 会话，正在继续选择 DFU 设备|Phát hiện phiên DFU chưa xong. Tiếp tục chọn thiết bị DFU
检测到可恢复 DFU 会话，主按钮将直接继续升级流程|Có phiên DFU có thể tiếp tục. Nút chính sẽ tiếp tục phiên này.
请先选择 DFU 固件包(.zip)|Hãy chọn gói cập nhật DFU (.zip) trước
请先选择 DFU 固件包|Hãy chọn gói cập nhật DFU trước
固件包中未找到可升级镜像|Không tìm thấy ảnh chương trình có thể cập nhật trong gói
预检查失败|Kiểm tra sơ bộ thất bại
固件包应用镜像过大，超过当前工程应用区上限|Ảnh ứng dụng trong gói quá lớn, vượt giới hạn vùng ứng dụng
请减小固件或调整Flash布局后再升级|Cần gói phần mềm nhỏ hơn hoặc bố trí flash phù hợp trước khi cập nhật
预检查提示：检测到疑似降级，设备可能拒绝升级|Kiểm tra sơ bộ: có thể đang hạ cấp, thiết bị có thể từ chối
预检查提示|Lưu ý kiểm tra sơ bộ
预警: 包版本低于设备版本，可能被拒绝|Cảnh báo: phiên bản gói thấp hơn thiết bị, có thể bị từ chối
正在切换到 DFU 模式|Đang chuyển sang chế độ DFU
正在按 unbonded buttonless DFU 流程切换到 Bootloader|Đang chuyển sang bộ nạp theo quy trình DFU không cần nút bấm
当前固件未暴露Buttonless DFU切换能力，请先手动让设备进入DFU模式(DfuTarg)后，再重新点击“选择设备并升级”。|Phần mềm hiện tại chưa hỗ trợ lệnh vào DFU. Đưa thiết bị vào DfuTarg thủ công rồi bấm “Chọn thiết bị và cập nhật”.
自动切DFU失败：固件不支持Buttonless切换，请手动让设备进入DfuTarg后再升级|Không tự vào được DFU. Hãy đưa thiết bị vào DfuTarg thủ công rồi cập nhật.
请先手动让设备进入DfuTarg，再重新点击升级|Đưa thiết bị vào DfuTarg thủ công rồi bấm cập nhật lại
等待用户手动选择 DFU 设备继续|Đợi chọn thiết bị DFU thủ công để tiếp tục
系统已配对不代表网页已授权，请手动重新选择 DfuTarg|Ghép đôi trong hệ thống chưa có nghĩa trang web đã được cấp quyền. Hãy chọn lại DfuTarg.
请手动选择 DfuTarg 继续|Chọn DfuTarg thủ công để tiếp tục
DFU设备选择已取消，但会话仍可继续|Đã hủy chọn thiết bị DFU, nhưng vẫn có thể tiếp tục phiên
DFU 已取消：用户关闭了设备选择窗口|Đã hủy DFU vì người dùng đóng hộp chọn thiết bị
可尝试点击“手动选择DFU设备并继续”重试|Có thể bấm “Chọn thiết bị DFU thủ công và tiếp tục” để thử lại
保留会话，等待用户手动重试|Giữ phiên, đợi người dùng thử lại thủ công
可手动选择设备重试|Có thể chọn thiết bị thủ công để thử lại
收到手动接管按钮点击|Đã bấm nút tiếp tục thủ công
DFU 正在执行，请稍候后再试|DFU đang chạy. Vui lòng đợi rồi thử lại.
没有待继续的DFU会话，请先点击“选择设备并升级”|Không có phiên DFU đang chờ. Hãy bấm “Chọn thiết bị và cập nhật” trước.
已取消手动选择，可再次点击继续|Đã hủy chọn thủ công. Có thể bấm tiếp tục để chọn lại.
DFU 手动选择已取消，当前会话保留，可再次点击继续|Đã hủy chọn DFU thủ công nhưng vẫn giữ phiên. Có thể bấm tiếp tục để chọn lại.
可尝试再次点击“手动选择DFU设备并继续”重试|Có thể bấm lại “Chọn thiết bị DFU thủ công và tiếp tục” để thử lại
保留会话，等待用户手动再次重试|Giữ phiên, đợi người dùng thử lại thủ công
可再次手动选择设备重试|Có thể chọn lại thiết bị thủ công để thử lại
环境自检通过，可执行离线 DFU|Môi trường đạt yêu cầu; có thể cập nhật DFU ngoại tuyến
DFU 环境自检通过|Môi trường DFU đạt yêu cầu
通过|Đạt
自检|Tự kiểm tra
请在弹窗中选择要切换的应用设备|Chọn thiết bị cần chuyển chế độ trong hộp thoại
开始手动切换 DFU 模式：请选择要重启到 DfuTarg 的应用设备|Bắt đầu chuyển DFU thủ công: chọn thiết bị cần khởi động vào DfuTarg
正在连接设备并发送 DFU 切换指令|Đang kết nối và gửi lệnh chuyển sang DFU
正在发送切换指令|Đang gửi lệnh chuyển chế độ
手动切换 DFU 模式成功！|Đã chuyển sang DFU thủ công!
手动切换 DFU 指令发送成功！设备应已重启进入 DfuTarg。升级流程已自动切换为“手动进入 DFU 模式”流程，请直接点击“选择设备并升级”选择 DfuTarg 设备。|Đã gửi lệnh vào DFU. Thiết bị sẽ khởi động vào DfuTarg. Bấm “Chọn thiết bị và cập nhật” rồi chọn DfuTarg để tiếp tục.
切换成功，请在设备重启后点击“选择设备并升级”|Đã chuyển chế độ. Đợi thiết bị khởi động lại rồi bấm “Chọn thiết bị và cập nhật”.
手动切换已取消：用户关闭了设备选择窗口|Đã hủy chuyển thủ công vì người dùng đóng hộp chọn thiết bị
手动切换失败|Chuyển chế độ thủ công thất bại
固件包加载失败|Không nạp được gói cập nhật
已恢复默认升级流程，请从应用设备重新开始|Đã khôi phục quy trình mặc định. Hãy bắt đầu lại từ thiết bị đang chạy.
已恢复默认 DFU 流程：后续将先选择应用设备再切换到 DfuTarg|Đã khôi phục quy trình DFU mặc định: chọn thiết bị đang chạy rồi chuyển sang DfuTarg
已放弃当前可恢复会话|Đã hủy phiên có thể tiếp tục
已放弃当前可恢复的 DFU 会话|Đã hủy phiên DFU có thể tiếp tục
暂无可导出的升级日志|Chưa có nhật ký cập nhật để tải xuống
升级日志已导出|Đã tải nhật ký cập nhật xuống
分步升级流程|Quy trình cập nhật từng bước
当前存在待继续的 DFU 会话。请在“步骤 3”中点击“继续升级”或“手动选择 DFU 设备并继续”。|Có phiên DFU đang chờ. Tại Bước 3, bấm “Tiếp tục cập nhật” hoặc “Chọn thiết bị DFU thủ công và tiếp tục”.
当前推荐分步流程：请先在“步骤 2”选择并重启设备，等设备进入 DFU 模式后，在“步骤 3”选择 DfuTarg 升级。|Nên cập nhật từng bước: tại Bước 2, chọn và khởi động lại thiết bị; khi đã vào DFU, sang Bước 3 chọn DfuTarg.
当前处于分步升级模式，且有未完成的会话。请勿重新开始，直接在“步骤 3”点击“继续升级”即可。|Đang có phiên cập nhật từng bước chưa xong. Không bắt đầu lại; bấm “Tiếp tục cập nhật” tại Bước 3.
系统受浏览器安全规则限制无法自动重连；分步手动流程可确保每次弹窗都有合法的用户手势交互，避免被浏览器拦截。|Quy tắc an toàn của trình duyệt có thể chặn tự kết nối lại. Quy trình từng bước cho phép bạn chủ động bấm chọn thiết bị ở mỗi giai đoạn.
当前按 Nordic 官方 unbonded buttonless DFU 流程执行：先选择应用设备，再切换到 DfuTarg。|Dùng quy trình DFU chính thức của Nordic: chọn thiết bị đang chạy trước, sau đó chuyển sang DfuTarg.
当前仍有一个可恢复的 DFU 会话。此时主按钮已切换为“继续升级”，点击后会直接继续选择 DFU 设备，不会重新走应用设备选择。|Vẫn có phiên DFU có thể tiếp tục. Nút chính “Tiếp tục cập nhật” sẽ cho chọn thiết bị DFU, không quay lại bước chọn thiết bị đang chạy.
页面跳转不会继承浏览器中的 GATT 连接，所以从主界面跳到本页后，升级阶段会重新选择应用设备；切到 Bootloader 后，即使系统蓝牙里已经显示 DfuTarg“已配对”，只要当前网页还没有该设备授权，页面仍会提示你再次手动确认。|Trang cập nhật không kế thừa kết nối GATT từ trang trước. Bạn cần chọn lại thiết bị; khi vào DfuTarg, hãy cấp quyền lại cho trang nếu được hỏi, dù hệ thống đã ghép đôi.
独立打开|Mở trực tiếp
当前页面未检测到主界面跳转状态。由于页面之间不能继承 Web Bluetooth 的 GATT 连接，升级时会重新选择应用设备或 DfuTarg。|Trang được mở trực tiếp. Do không kế thừa kết nối Bluetooth giữa các trang, hãy chọn lại thiết bị đang chạy hoặc DfuTarg để cập nhật.
未检测到主界面跳转状态，按独立 DFU 页面处理|Không có trạng thái từ trang điều khiển; dùng trang DFU độc lập
主界面跳转|Mở từ trang điều khiển
未知来源|Không rõ nguồn mở trang
已从主界面进入 DFU 升级页。跳转前已断开设备|Đã mở trang cập nhật DFU từ trang điều khiển. Đã ngắt kết nối thiết bị
的主连接；进入本页后需要重新选择应用设备或 DfuTarg 才能升级。|trước khi chuyển trang. Hãy chọn lại thiết bị đang chạy hoặc DfuTarg để cập nhật.
已从主界面进入 DFU 升级页。浏览器不会跨页面保留蓝牙连接；进入本页后需要重新选择应用设备或 DfuTarg 才能升级。|Đã mở trang DFU. Trình duyệt không giữ kết nối giữa các trang; hãy chọn lại thiết bị đang chạy hoặc DfuTarg.
从主界面进入 DFU 页，原连接设备|Mở trang DFU từ trang điều khiển, thiết bị trước đó
已从主界面进入 DFU 升级页。主界面当时没有活动蓝牙连接，本页将从选择设备开始执行 DFU。|Đã mở trang DFU khi chưa có kết nối Bluetooth. Bắt đầu bằng cách chọn thiết bị.
从主界面进入 DFU 页，未携带活动连接|Mở trang DFU từ trang điều khiển, không có kết nối đang hoạt động
DFU 升级进行中，请先等待完成或失败后再返回|DFU đang chạy. Đợi kết thúc trước khi quay lại.
已阻止返回主界面：当前 DFU 正在进行中|Chưa thể về trang điều khiển vì DFU đang chạy
当前有可恢复的 DFU 会话，离开页面后将无法继续。确定返回主界面吗？|Có phiên DFU đang chờ tiếp tục. Rời trang sẽ mất phiên này. Vẫn về trang điều khiển?
已取消返回主界面：保留当前可恢复的 DFU 会话|Đã hủy quay lại; giữ phiên DFU đang chờ
DFU 升级进行中，暂时不能放弃当前会话|DFU đang chạy, chưa thể hủy phiên
已阻止放弃当前会话：当前 DFU 正在进行中|Chưa thể hủy phiên vì DFU đang chạy
当前没有可放弃的 DFU 会话|Không có phiên DFU để hủy
放弃后将无法继续当前 DFU 会话。确定要放弃吗？|Sau khi hủy sẽ không thể tiếp tục phiên DFU này. Bạn có chắc muốn hủy?
已取消放弃当前 DFU 会话|Đã giữ lại phiên DFU hiện tại
已放弃当前 DFU 会话|Đã hủy phiên DFU hiện tại
当前仍有进行中或待继续的 DFU 会话，暂时不能恢复默认流程|Còn phiên DFU đang chạy hoặc chờ tiếp tục; chưa thể khôi phục quy trình mặc định
已阻止恢复默认流程：当前仍存在活动或待继续的 DFU 会话|Chưa thể khôi phục mặc định vì còn phiên DFU đang hoạt động hoặc chờ tiếp tục
已恢复默认升级流程|Đã khôi phục quy trình cập nhật mặc định
连接正常运行的设备，将它重启到 DfuTarg。设备已处于 DfuTarg 时，可直接进入下一步。|Kết nối thiết bị đang chạy để khởi động vào DfuTarg. Nếu đã ở DfuTarg, chuyển thẳng sang bước tiếp theo.
页面跳转不会继承浏览器中的 GATT 连接，所以从主界面跳到本页后，升级阶段会重新选择应用设备；切到 Bootloader 后，如果浏览器尚未持有 DfuTarg 授权，页面会提示你再次确认。|Trang mới không kế thừa kết nối Bluetooth. Bạn cần chọn lại thiết bị; sau khi vào bộ nạp, trình duyệt có thể yêu cầu cấp quyền cho DfuTarg lần nữa.
请在浏览器中选择设备，连接完成后可开始操作。|Chọn thiết bị trong trình duyệt. Khi kết nối xong, bạn có thể bắt đầu sử dụng.
设备正在处理操作，请等待完成。|Thiết bị đang xử lý. Vui lòng đợi hoàn tất.
设备已连接|Đã kết nối thiết bị
墨水屏已就绪，可以开始操作。|Màn hình đã sẵn sàng. Bạn có thể bắt đầu sử dụng.
蓝牙暂不可用|Bluetooth hiện không khả dụng
请通过 HTTPS 或本机地址打开页面，以使用浏览器蓝牙。|Mở trang bằng HTTPS hoặc địa chỉ localhost để sử dụng Bluetooth.
建议使用支持 Web Bluetooth 的 Chrome 或 Edge 浏览器；图片编辑仍可使用。|Nên dùng Chrome hoặc Edge có hỗ trợ Web Bluetooth. Phần chỉnh ảnh vẫn sử dụng được khi chưa kết nối.
未选择图片，请先选择一个图片文件。|Chưa chọn ảnh. Hãy chọn một tệp ảnh trước.
图片文件为空，请重新选择图片。|Tệp ảnh trống. Hãy chọn lại ảnh.
图片格式不支持，请选择 PNG、JPG、BMP 或 WebP 文件。|Định dạng ảnh không được hỗ trợ. Hãy chọn PNG, JPG, BMP hoặc WebP.
每次请选择一张图片进行编辑。|Mỗi lần chỉ chọn một ảnh để chỉnh sửa.
当前浏览器无法接收拖放图片，请点击“选择图片”载入文件。|Trình duyệt không nhận ảnh kéo thả. Hãy bấm “Chọn ảnh” để mở tệp.
暂无日志可导出。|Chưa có nhật ký để tải xuống.
日志已导出。|Đã tải nhật ký xuống.
日志导出失败，请重试。|Không tải được nhật ký. Hãy thử lại.
画布未准备好，请稍后重试。|Vùng ảnh chưa sẵn sàng. Hãy thử lại sau.
请先完成图片裁剪，再下载预览。|Hãy cắt ảnh xong trước khi tải ảnh xem trước.
预览导出失败，请重试。|Không xuất được ảnh xem trước. Hãy thử lại.
预览已下载。|Đã tải ảnh xem trước.
调整参数已恢复默认值，完成裁剪后应用。|Đã khôi phục thông số mặc định; thông số sẽ áp dụng khi cắt ảnh xong.
图片调整已恢复默认值。|Đã khôi phục thông số chỉnh ảnh mặc định.
电压过低，需要更换电池或充电，容易出现传图异常、屏幕异常|Pin quá yếu, có thể gây lỗi truyền ảnh hoặc hiển thị. Hãy thay pin hoặc sạc pin.
旧固件配置已修改，请等待保存完成后断开重连，再导出备份|Đã đổi cấu hình phần mềm cũ. Đợi lưu xong, kết nối lại rồi mới xuất bản sao lưu.
配置读取请求失败|Không gửi được yêu cầu đọc cấu hình
配置读取确认超时|Hết thời gian chờ xác nhận đọc cấu hình
配置尚未成功保存，未生成迁移备份|Cấu hình chưa lưu thành công; chưa tạo bản sao lưu chuyển đổi
连接已变化，未生成迁移备份|Kết nối đã thay đổi; chưa tạo bản sao lưu chuyển đổi
标注读取失败，未生成迁移备份|Không đọc được ghi chú ngày; chưa tạo bản sao lưu chuyển đổi
已导出迁移备份：配置|Đã xuất bản sao lưu: cấu hình
 B，标注|B, ghi chú ngày
正在导出迁移备份，请完成后再修改设备|Đang xuất bản sao lưu. Hãy đợi xong trước khi chỉnh thiết bị.
服务不可用，请检查蓝牙连接|Dịch vụ không khả dụng. Hãy kiểm tra kết nối Bluetooth.
服务已变更，放弃过期的蓝牙写入|Dịch vụ đã thay đổi; đã bỏ yêu cầu ghi Bluetooth cũ
屏幕初始化确认超时|Hết thời gian chờ xác nhận khởi tạo màn hình
模式应用确认超时|Hết thời gian chờ xác nhận đổi chế độ
屏幕刷新确认超时|Hết thời gian chờ xác nhận làm mới màn hình
颜色|Màu
块(CRC)|Khối (CRC)
确认设置驱动配置？此操作将重新初始化屏幕。|Áp dụng cấu hình màn hình? Thao tác này sẽ khởi tạo lại màn hình.
驱动配置已设置|Đã áp dụng cấu hình màn hình
驱动初始化失败，请检查连接和引脚配置|Khởi tạo màn hình thất bại. Hãy kiểm tra kết nối và cấu hình chân.
已由设备接受，星期第一天为|Thiết bị đã nhận yêu cầu. Ngày đầu tuần là
设备正在刷新屏幕，无需断开蓝牙；请等待刷新完成。|Thiết bị đang làm mới màn hình. Không cần ngắt Bluetooth; vui lòng đợi hoàn tất.
未被设备接受，请稍后重试。|Thiết bị chưa nhận yêu cầu. Hãy thử lại sau.
当前固件不支持静默校时，已跳过自动时间同步|Phần mềm này chưa hỗ trợ chỉnh giờ không vẽ lại; đã bỏ qua tự đồng bộ giờ
已自动同步当前时间到设备|Đã tự đồng bộ giờ hiện tại vào thiết bị
自动时间同步失败|Tự đồng bộ giờ thất bại
确认切换到|Chuyển sang
警告：分钟刷新会加速屏幕老化导致损坏！|Lưu ý: làm mới mỗi phút làm tăng số chu kỳ hoạt động của màn hình.
请勿长时间使用|Cần theo dõi chất lượng màn hình khi sử dụng lâu dài
费电|Tốn pin hơn chế độ ảnh tĩnh
此模式仅适用于UC8179 7.5寸屏幕|Chế độ này chỉ dành cho màn hình 7.5 inch phù hợp
确认清除屏幕内容?|Xóa nội dung màn hình?
设备已确认清屏完成。|Thiết bị đã xác nhận xóa màn hình xong.
清屏指令已发送，请等待屏幕刷新完成。|Đã gửi yêu cầu xóa. Vui lòng đợi màn hình làm mới xong.
确认发送命令？此操作可能影响设备状态。|Gửi lệnh? Thao tác này có thể làm thay đổi trạng thái thiết bị.
命令已发送|Đã gửi lệnh
警告：画布尺寸和驱动不匹配，是否继续？|Kích thước ảnh không khớp màn hình. Bạn có muốn tiếp tục?
警告：颜色模式和驱动不匹配，是否继续？|Chế độ màu không khớp màn hình. Bạn có muốn tiếp tục?
检测到画布尺寸互换，但旋转状态异常(|Chiều rộng và cao bị hoán đổi, nhưng góc xoay không hợp lệ (
°)。将按默认方向(-90°)适配。|°). Sẽ xoay theo hướng mặc định (-90°).
是否继续发送？|Tiếp tục gửi?
检测到画布方向与驱动不一致，发送前自动旋转适配为|Hướng ảnh không khớp màn hình. Tự xoay ảnh trước khi gửi thành
尚未收到MTU，发送一次INIT用于协商（不作为常规传图步骤）|Chưa nhận được MTU. Gửi một yêu cầu khởi tạo để thương lượng, không lặp bước này ở mỗi lần truyền ảnh.
屏幕初始化失败，取消发送|Khởi tạo màn hình thất bại; đã hủy gửi
MTU仍为默认20，取消发送以免超过512块上限导致花屏|MTU vẫn là 20. Hủy gửi để tránh vượt 512 khối và làm lỗi ảnh.
CRC 传图模块未加载，请刷新网页后重试|Chưa nạp mô-đun truyền ảnh CRC. Hãy tải lại trang rồi thử lại.
使用CRC校验传输模式|Đang dùng truyền ảnh có kiểm tra CRC
当前固件不支持此颜色模式。|Phần mềm thiết bị không hỗ trợ chế độ màu này.
传图失败|Truyền ảnh thất bại
传图完成！传图耗时|Đã truyền ảnh! Thời gian truyền
等待屏幕刷新|Đợi màn hình làm mới
发送完成后设备连接已断开，请点击“重连”继续操作。|Đã gửi xong nhưng kết nối bị ngắt. Hãy bấm “Kết nối lại” để tiếp tục.
刷新指令发送失败，请重试。|Gửi yêu cầu làm mới thất bại. Hãy thử lại.
图片刷新完成！传图耗时|Ảnh đã hiển thị xong! Thời gian truyền
刷新耗时|Thời gian làm mới
总耗时|Tổng thời gian
图片发送完成！传图耗时|Đã gửi ảnh! Thời gian truyền
刷新指令已发送，屏幕刷新中。|Đã gửi yêu cầu; màn hình đang làm mới.
屏幕刷新完成前请不要操作。|Vui lòng đợi màn hình làm mới xong trước khi thao tác tiếp.
图片已发送，设备连接已断开，请点击“重连”继续操作。|Đã gửi ảnh. Kết nối đã ngắt; bấm “Kết nối lại” để tiếp tục.
错误：预期|Lỗi: cần
字节，但得到|byte, nhưng nhận được
数组大小不匹配。请检查图像尺寸和模式。|Dung lượng ảnh không khớp. Hãy kiểm tra kích thước và chế độ màu.
已断开连接|Đã ngắt kết nối
设备操作进行中，请等待完成后再进入固件升级。|Thiết bị đang xử lý. Đợi xong rồi mới mở trang cập nhật phần mềm.
启用NRF_EPD过滤|Chỉ tìm thiết bị NRF_EPD
当前显示全部蓝牙设备，点击后仅显示NRF_EPD设备|Đang hiện tất cả thiết bị Bluetooth. Bấm để chỉ hiện NRF_EPD.
设备过滤已启用，仅显示|Đã bật lọc, chỉ hiện tên bắt đầu bằng
开头设备|thiết bị có tiền tố này
设备过滤已关闭，将显示全部蓝牙设备|Đã tắt lọc; sẽ hiện tất cả thiết bị Bluetooth
设备选择弹窗不可用，请刷新页面后重试|Không mở được hộp chọn thiết bị. Hãy tải lại trang rồi thử lại.
设备（已按信号强度排序，越靠前越强）|thiết bị (xếp theo tín hiệu, mạnh nhất ở đầu)
推荐|Đề xuất
扫描中|Đang quét
当前浏览器不支持信号扫描排序，请改用“不过滤设备”或系统筛选|Trình duyệt không hỗ trợ xếp theo tín hiệu. Dùng “Không lọc thiết bị” hoặc hộp chọn của hệ thống.
蓝牙扫描不可用，将退回系统设备选择|Không quét được tín hiệu; chuyển sang hộp chọn thiết bị của hệ thống
扫描完成，未发现|Đã quét xong, không tìm thấy
扫描完成，发现|Đã quét xong, tìm thấy
个目标设备，最强信号|thiết bị phù hợp, tín hiệu mạnh nhất
设备过滤已关闭，打开系统蓝牙选择窗口(全部设备)|Đã tắt lọc; mở hộp chọn Bluetooth của hệ thống (tất cả thiết bị)
当前浏览器不支持信号扫描排序，退回系统窗口并仅筛选|Trình duyệt không hỗ trợ xếp theo tín hiệu. Dùng hộp chọn hệ thống và lọc
设备，请先让设备进入配对模式后重试|thiết bị. Hãy bật chế độ kết nối trên thiết bị rồi thử lại.
未发现|Không tìm thấy
开头设备。|thiết bị có tiền tố này.
请先让设备进入配对模式并重新搜索。|Hãy bật chế độ kết nối trên thiết bị và tìm lại.
如果再次搜索仍没有目标设备，请点击“不过滤设备”按钮，显示所有蓝牙设备后再连接。|Nếu vẫn không tìm thấy, bấm “Không lọc thiết bị” rồi chọn trong danh sách tất cả thiết bị Bluetooth.
已选择目标设备|Đã chọn thiết bị
已取消蓝牙设备选择|Đã hủy chọn thiết bị Bluetooth
请检查蓝牙是否已开启，且使用的浏览器支持蓝牙！建议使用以下浏览器|Hãy bật Bluetooth và dùng trình duyệt có hỗ trợ Bluetooth. Gợi ý
电脑|Máy tính
浏览器|Trình duyệt
正在重连|Đang kết nối lại
设备刷新失败（状态|Thiết bị làm mới thất bại (trạng thái
），请检查屏幕或稍后重试|), hãy kiểm tra màn hình hoặc thử lại sau
配置写入外置 Flash 失败（状态|Ghi cấu hình vào flash ngoài thất bại (trạng thái
MTU 已更新为|MTU đã đổi thành
远端时间|Giờ trên thiết bị
收到配置|Đã nhận cấu hình
英寸|inch
屏幕型号|Loại màn hình
屏幕尺寸|Kích thước màn hình
检测到UC8179，已启用全屏时钟按钮|Đã nhận diện màn 7.5; đã bật nút đồng hồ toàn màn
连接流程进行中，请稍候|Đang kết nối, vui lòng đợi
连接已取消或设备状态已变化|Kết nối đã hủy hoặc trạng thái thiết bị đã thay đổi
复用已有 GATT 连接|Sử dụng kết nối GATT hiện có
获取特征超时|Hết thời gian chờ đọc dịch vụ
准备重试|Chuẩn bị thử lại
连接初始化已中断，请重新连接设备|Khởi tạo kết nối bị gián đoạn. Hãy kết nối lại thiết bị.
无法读取固件版本，请使用与设备固件匹配的网页|Không đọc được phiên bản thiết bị. Hãy dùng trang web phù hợp với phần mềm đang nạp
当前网页需要固件 0x|Trang này yêu cầu phần mềm từ 0x
及以上；设备为 0x|trở lên; thiết bị đang là 0x
请使用对应旧版网页|Hãy dùng trang web cũ tương ứng
等待上报|Đợi thiết bị phản hồi
连接后初始化失败：INIT 命令未完成|Khởi tạo kết nối thất bại: thiết bị chưa hoàn tất lệnh khởi tạo
连接后自动时间同步失败|Không tự đồng bộ được giờ sau khi kết nối
传图MTU已就绪|MTU truyền ảnh đã sẵn sàng
尚未收到设备MTU，发图前会再等待一次|Chưa nhận được MTU. Sẽ đợi lại trước khi gửi ảnh.
已重新连接，历史日志已清空。|Đã kết nối lại và xóa nhật ký cũ.
连接初始化失败|Khởi tạo kết nối thất bại
开启|Bật
关闭|Tắt
Console日志输出已|Ghi nhật ký console đã
已进入裁剪模式：缩放、拖动图片使其填满画布，再点击“完成”。|Đang cắt ảnh: phóng to, kéo ảnh cho vừa khung rồi bấm “Hoàn tất”.
竖屏编辑(发送自动适配)|Chỉnh ảnh dọc (tự điều chỉnh khi gửi)
自定义方向|Hướng tùy chọn
画布已旋转90°|Đã xoay ảnh 90°
画布已镜像(左右)|Đã lật ảnh trái/phải
画布已翻转(上下)|Đã lật ảnh trên/dưới
画布尺寸已同步为|Kích thước ảnh đã đổi thành
无对应预设，请手动确认尺寸|Không có kích thước đặt sẵn phù hợp. Hãy kiểm tra kích thước thủ công.
清除画布内容?|Xóa nội dung vùng ảnh?
正常模式|Chế độ thường
注意：开发模式功能已开启！不懂请不要随意修改，否则后果自负！|Đã bật chế độ nâng cao. Chỉ thay đổi thông số khi bạn hiểu rõ tác dụng của chúng.
课程文本过长，请分批导入。|Nội dung thời khóa biểu quá dài. Hãy chia nhỏ để nhập.
请先粘贴课程内容。|Hãy dán nội dung thời khóa biểu trước.
最多支持 12 节、7 天，请检查行数和 Tab 分列。|Hỗ trợ tối đa 12 tiết và 7 ngày. Hãy kiểm tra số dòng và dấu Tab phân cột.
资源校验模块未加载|Chưa nạp mô-đun kiểm tra dữ liệu
ZIP 文件列表无效或过大|Danh sách tệp ZIP không hợp lệ hoặc quá lớn
ZIP 文件名必须是单个 ASCII 文件名|Tên tệp trong ZIP phải là tên ASCII, không chứa đường dẫn
ZIP 文件名重复|Tên tệp ZIP bị trùng
ZIP 文件数据无效|Dữ liệu tệp ZIP không hợp lệ
ZIP 过大，超出 ZIP32 容量|ZIP quá lớn, vượt dung lượng ZIP32
必须为文本且不能包含 NUL|phải là văn bản và không chứa ký tự NUL
文本缺少结束符|Văn bản thiếu ký tự kết thúc
两个农历计算表的基准年必须等于 year_min - 1|Năm cơ sở của hai bảng âm lịch phải bằng year_min - 1
包含重复日期|chứa ngày bị trùng
索引越界或格式不兼容|chỉ mục vượt giới hạn hoặc định dạng không tương thích
节假日标志不兼容|Cờ ngày nghỉ không tương thích
的 ID、模式、类型和 flags 不能改变|không được đổi ID, chế độ, loại hoặc cờ flags
超出 800×480 画布|vượt khung 800×480
缺少主字体|thiếu phông chính
组件 10 缺少第二字体|Thành phần 10 thiếu phông thứ hai
日历标题参数越界|Thông số tiêu đề lịch vượt giới hạn
文字组件参数越界|Thông số thành phần chữ vượt giới hạn
时钟标题参数越界|Thông số tiêu đề đồng hồ vượt giới hạn
的时钟几何不兼容|có kích thước đồng hồ không tương thích
的头或几何不兼容|có phần đầu hoặc kích thước không tương thích
字体入口越界|Vị trí bắt đầu phông vượt giới hạn
字体表缺少结束符|Bảng phông thiếu ký tự kết thúc
字体记录越界|Bản ghi phông vượt giới hạn
字体记录长度错误|Độ dài bản ghi phông không đúng
Unicode 索引越界|Chỉ mục Unicode vượt giới hạn
字体必须使用单个 Unicode 块|Phông phải sử dụng một khối Unicode duy nhất
字体目录不完整|Danh mục phông chưa đầy đủ
字体目录越界或重叠|Danh mục phông vượt giới hạn hoặc chồng lấn
待办字体标识|Mã phông việc cần làm
待办基础字号|Cỡ chữ cơ bản cho việc cần làm
待办字体名称或字形设置无效|Tên phông hoặc thông số kiểu chữ việc cần làm không hợp lệ
资源载荷长度无效|Độ dài nội dung dữ liệu không hợp lệ
个字模|ký tự
仅统计 CRC 已校验的有效资源（含 32 字节包头）。仅读包头、未安装或校验失败的资源占用未确认；余量仅统计资源分区，系统区与保留区未纳入。|Chỉ tính dữ liệu đã kiểm tra CRC, gồm 32 byte phần đầu. Chưa xác nhận dung lượng dữ liệu chỉ mới đọc phần đầu hoặc chưa cài thành công. Không tính vùng hệ thống và dự phòng.
剩余|còn trống
上次|Lần trước
已加载|Đã nạp
网页字体模块未加载，请刷新页面|Chưa nạp mô-đun phông web. Hãy tải lại trang.
无法完整回读资源|không thể đọc lại đầy đủ dữ liệu
资源包超出目标分区容量（含 32 字节包头）|Gói dữ liệu vượt dung lượng phân vùng đích, gồm 32 byte phần đầu
资源版本已用尽，请重新安装资源|Đã hết số phiên bản dữ liệu. Hãy cài lại dữ liệu.
设备没有可用的待办存储空间|Thiết bị không có vùng trống để lưu việc cần làm
请先安装有效资源并升级支持待办的固件|Hãy cài dữ liệu hợp lệ và phần mềm có hỗ trợ việc cần làm trước
待办分区类型不兼容|Loại phân vùng việc cần làm không tương thích
待办数据校验失败，请恢复设备资源|Dữ liệu việc cần làm bị lỗi. Hãy cài lại dữ liệu thiết bị.
读取期间待办数据已变化，请重新读取|Dữ liệu việc cần làm thay đổi trong lúc đọc. Hãy đọc lại.
读取期间待办数据已变化，请重新保存|Dữ liệu việc cần làm thay đổi trong lúc đọc. Hãy lưu lại.
正在等待设备完成当前刷新|Đợi thiết bị làm mới màn hình xong
设备分区表已变化，请重新保存|Bảng phân vùng đã thay đổi. Hãy lưu lại.
正在创建待办存储空间|Đang tạo vùng lưu việc cần làm
正在保存待办到设备|Đang lưu việc cần làm vào thiết bị
正在保存待办|Đang lưu việc cần làm
待办已提交，正在应用|Đã gửi việc cần làm; đang áp dụng
保存失败，正在恢复设备原有待办和字库|Lưu thất bại; đang khôi phục danh sách và phông trước đó
设备未确认待办恢复为未安装状态|Thiết bị chưa xác nhận trả danh sách việc cần làm về trạng thái chưa cài
设备原有待办和字库已恢复，请重试保存。|Đã khôi phục danh sách và phông trước đó. Hãy thử lưu lại.
原有待办/字库恢复未完成|Chưa khôi phục xong danh sách hoặc phông trước đó
不支持；仅支持 BMP 中可显示的字符，不能使用控制字符或代理项|không hỗ trợ; chỉ dùng ký tự hiển thị được trong BMP, không dùng ký tự điều khiển hoặc surrogate
字体头的编码位宽无效|Độ rộng mã hóa phần đầu phông không hợp lệ
有冲突的字形记录|có bản ghi ký tự bị xung đột
待办基础字体槽位|Ô phông cơ bản cho việc cần làm
一次保存只能使用一种待办字体|Mỗi lần lưu chỉ dùng một phông cho việc cần làm
字体需求必须包含文本 text|Yêu cầu phông phải chứa trường văn bản text
不支持；设备仅支持 BMP 字符，不能使用 emoji 或代理项|không hỗ trợ; thiết bị chỉ hỗ trợ ký tự BMP, không hỗ trợ emoji hoặc surrogate
缺少可编码的字形点阵|thiếu ảnh điểm ký tự có thể mã hóa
前进宽度|Bước tiến ký tự
宽度|Chiều rộng
高度|Chiều cao
偏移|Độ lệch
超出字体槽位允许的|vượt giới hạn cho phép của ô phông
请使用较小字体槽位|Hãy chọn ô phông cỡ nhỏ hơn
的空白字形宽高必须同时为 0|phải có chiều rộng và cao cùng bằng 0 nếu là ký tự trống
的点阵数据必须为 width×height 个 0 或 1|phải có dữ liệu ảnh điểm gồm width×height giá trị 0 hoặc 1
的压缩字形超过设备允许的 255 字节|có ảnh ký tự nén vượt giới hạn 255 byte của thiết bị
的字形记录长度无效|có độ dài bản ghi ký tự không hợp lệ
的压缩字形提前结束|có ảnh ký tự nén kết thúc sớm
的字形超出槽位尺寸|có ảnh ký tự vượt kích thước ô phông
的压缩游程无效|có dữ liệu nén ký tự không hợp lệ
的 ASCII 表超出 16 位索引范围|có bảng ASCII vượt phạm vi chỉ mục 16 bit
浏览器不支持字体加载和 Canvas 字形生成|Trình duyệt không hỗ trợ nạp phông và tạo ảnh ký tự Canvas
加载浏览器字体失败|Không nạp được phông trình duyệt
浏览器无法创建 Canvas 字形画布|Trình duyệt không tạo được vùng vẽ ký tự Canvas
超出字形画布，请更换字体|vượt vùng vẽ ký tự. Hãy chọn phông khác.
浏览器字体不支持|Phông trình duyệt không hỗ trợ
未生成可显示的点阵；请更换系统字体|không tạo được ảnh điểm hiển thị; hãy chọn phông hệ thống khác
检测到缺字占位方框；请安装支持该字符的系统字体|phát hiện ô vuông thay cho ký tự thiếu; hãy cài phông hệ thống có ký tự này
正在生成|Đang tạo
有效|Hợp lệ
格式错误|Sai định dạng
读写失败|Đọc/ghi thất bại
版本不兼容|Phiên bản không tương thích
写入受保护|Vùng ghi được bảo vệ
未知状态|Trạng thái không rõ
资源包头长度错误|Độ dài phần đầu gói tài nguyên sai
资源格式或分区|Định dạng tài nguyên hoặc phân vùng
不兼容|Không tương thích
资源包头|Phần đầu gói tài nguyên
资源包超出分区容量|Gói tài nguyên vượt dung lượng phân vùng
分区表长度或|Độ dài bảng phân vùng hoặc
分区表包含重复|Bảng phân vùng chứa mục trùng
重叠|Chồng lấn
越界或不兼容条目|Mục vượt giới hạn hoặc không tương thích
分区表定位条目错误|Mục định vị bảng phân vùng sai
无法读取资源能力|Không đọc được khả năng tài nguyên
旧固件可能不支持资源协议|Phần mềm cũ có thể chưa hỗ trợ giao thức tài nguyên
设备不支持外置|Thiết bị chưa hỗ trợ bộ nhớ ngoài
读写或资源|Đọc/ghi hoặc tài nguyên
容量不兼容|Dung lượng không tương thích
设备分区表中不存在目标分区|Không có phân vùng đích trên thiết bị
请先安装分区表|Hãy cài bảng phân vùng trước
更新状态区和保留区不可上传|Không thể tải vào vùng trạng thái cập nhật và dự phòng
资源包超出目标分区容量|Gói vượt dung lượng phân vùng đích
资源包编译时间戳错误|Thời điểm biên dịch gói không đúng
不支持的分区|Phân vùng không hỗ trợ
请选择包含|Hãy chọn thư mục chứa
资源包的文件夹|các gói tài nguyên
资源包中存在重复的分区|Gói tài nguyên có phân vùng trùng
资源包不完整|Gói tài nguyên chưa đầy đủ
一键烧录不支持分区|Cài nhanh không hỗ trợ phân vùng
分区表状态为|Trạng thái bảng phân vùng là
不能按空白设备处理|không thể xử lý như thiết bị trống
重新连接后重新上传|Kết nối lại rồi tải lại
设备返回|Thiết bị trả về
资源校验失败|Kiểm tra tài nguyên không đạt
资源校验响应长度错误|Độ dài phản hồi kiểm tra tài nguyên sai
读取响应长度错误|Độ dài phản hồi đọc sai
请先终止未完成事务|Hãy kết thúc phiên chưa hoàn tất trước
设备配置|Cấu hình thiết bị
字体资源|Tài nguyên phông
更新状态|Trạng thái cập nhật
上次读取|Lần đọc trước
待刷新|Cần cập nhật
设备读回|Đọc từ thiết bị
尚未读取|Chưa đọc
数据为上次读取|Dữ liệu từ lần đọc trước
资源已变更|Tài nguyên đã thay đổi
请重新读取分区|Hãy đọc lại phân vùng
余量仅统计资源分区|Chỉ tính dung lượng trống của phân vùng tài nguyên
系统区与保留区未纳入|Không tính vùng hệ thống và dự phòng
系统区与保留区占用未统计|Chưa tính dung lượng vùng hệ thống và dự phòng
仅统计|Chỉ tính
已校验的有效资源|Tài nguyên hợp lệ đã kiểm tra
仅读包头|Chỉ đọc phần đầu
未安装或校验失败的资源占用未确认|Chưa xác định dung lượng tài nguyên chưa cài hoặc kiểm tra lỗi
连接已建立|Đã kết nối
读取分区后查看设备资源用量|Đọc phân vùng để xem dung lượng trên thiết bị
占用与余量未确认|Chưa xác nhận dung lượng dùng/còn trống
包头申报|Theo phần đầu gói
尚未加载分区表|Chưa nạp bảng phân vùng
容量未读取|Chưa đọc dung lượng
估算资源|Tài nguyên dự kiến
已校验资源|Tài nguyên đã kiểm tra
占总容量|chiếm tổng dung lượng
分区余量|Phân vùng còn trống
含包头|Gồm phần đầu
内容未校验|Chưa kiểm tra nội dung
读取待确认|Chưa xác nhận đọc
设备已读回|Đã đọc từ thiết bị
读取未完成|Chưa đọc xong
待重新读取|Cần đọc lại
待更新|Cần cập nhật
一致性未确认|Chưa xác nhận dữ liệu giống nhau
读取或校验失败|Đọc hoặc kiểm tra thất bại
读取分区后显示各模块的设备版本与校验结果|Đọc phân vùng để xem phiên bản và kết quả kiểm tra từng phần
连接设备后读取资源版本|Kết nối để đọc phiên bản tài nguyên
尚未选择资源目录|Chưa chọn thư mục tài nguyên
资源包不可用|Gói tài nguyên không khả dụng
本地资源目录|Thư mục tài nguyên trên máy
已回读|Đã đọc lại
校验通过|Kiểm tra đạt
这是更新前的回读数据|Đây là dữ liệu đọc trước khi cập nhật
保存当前资源请重新回读|Đọc lại để lưu tài nguyên hiện tại
解压后得到原始|Giải nén để lấy dữ liệu gốc
完整回读分区表|Đọc đầy đủ bảng phân vùng
设备配置和日期标注后|sau cấu hình và đánh dấu ngày
蓝牙写入未完成|Chưa ghi xong qua Bluetooth
设备资源连接不可用或正在执行其他任务|Kết nối tài nguyên không khả dụng hoặc đang có việc khác
待办资源模块或设备连接不可用|Mô-đun công việc hoặc kết nối chưa sẵn sàng
可读写|Có thể đọc/ghi
资源大小超出分区容量|Tài nguyên vượt dung lượng phân vùng
资源占用与版本未确认|Chưa xác nhận dung lượng và phiên bản tài nguyên
正在准备完整回读设备资源|Đang chuẩn bị đọc đầy đủ tài nguyên thiết bị
请等待更新完成后回读|Chờ cập nhật xong rồi đọc lại
待办资源校验失败|Kiểm tra tài nguyên công việc thất bại
设备分区表缺少|Bảng phân vùng thiếu
完成全部资源校验后可保存|Có thể lưu sau khi kiểm tra xong toàn bộ tài nguyên
回读资源的分区|Phân vùng tài nguyên đọc lại
不匹配|Không khớp
回读期间分区表发生变化|Bảng phân vùng thay đổi trong lúc đọc
请重新回读|Hãy đọc lại
可保存到本地|Có thể lưu về máy
回读失败|Đọc lại thất bại
请先完整回读设备资源|Hãy đọc đầy đủ tài nguyên trước
已发起下载|Đã bắt đầu tải về
保存回读数据失败|Lưu dữ liệu đọc lại thất bại
已保留设备待办字体|Đã giữ lại phông công việc trên thiết bị
保留了|Đã giữ lại
个设备字模|chữ trên thiết bị
已写入|Đã ghi
正在校验并提交|Đang kiểm tra và hoàn tất ghi
资源已提交|Đã hoàn tất ghi tài nguyên
资源已校验并应用|Đã kiểm tra và áp dụng tài nguyên
设备将刷新屏幕|Thiết bị sẽ làm mới màn hình
无需断开连接|Không cần ngắt kết nối
设备资源内容一致|Tài nguyên trên thiết bị giống gói đã chọn
无需写入|Không cần ghi lại
初始化完成|Khởi tạo hoàn tất
资源更新完成|Cập nhật tài nguyên hoàn tất
正在应用数据并断开连接|Đang áp dụng dữ liệu và ngắt kết nối
蓝牙继续按原策略间歇广播|Bluetooth tiếp tục quảng bá gián đoạn như bản gốc
当前固件不支持应用后自动断开连接|Phần mềm này chưa hỗ trợ tự ngắt sau khi áp dụng
请手动断开|Hãy ngắt kết nối thủ công
正在校验资源目录|Đang kiểm tra thư mục tài nguyên
时间最新的是|Bản mới nhất là
请只选择这一层文件夹|Chỉ chọn đúng thư mục ở cấp này
请只选择其中一套资源包所在的文件夹|Chỉ chọn thư mục chứa một bộ tài nguyên
选中的目录里有|Thư mục đã chọn có
套资源包|bộ tài nguyên
不能直接烧录|Không thể cài trực tiếp
请不要选择|Không chọn
这种上级目录|thư mục cấp trên này
改选其中一个文件夹|Hãy chọn một thư mục con
请先加载默认模板或选择资源目录|Hãy nạp mẫu mặc định hoặc chọn thư mục tài nguyên
资源目录已变化|Thư mục tài nguyên đã thay đổi
请重新生成|Hãy tạo lại
资源或设备任务已变化|Tài nguyên hoặc tác vụ đã thay đổi
网页生成的资源|Tài nguyên tạo trên web
可一键烧录或下载|Có thể cài hoặc tải về
不是完整的设备资源工程|Không phải dự án tài nguyên đầy đủ
工程文件名或长度无效|Tên hoặc độ dài tệp dự án sai
无法读取默认模板|Không đọc được mẫu mặc định
请通过本地网页服务打开页面或选择资源目录|Hãy mở bằng máy chủ web hoặc chọn thư mục tài nguyên
默认模板|Mẫu mặc định
工程文件过大|Tệp dự án quá lớn
旧字库恢复未完成|Chưa khôi phục xong phông cũ
请重新连接并修复设备资源|Kết nối lại để khôi phục tài nguyên thiết bị
字体资源版本已用尽|Phiên bản tài nguyên phông đã đạt giới hạn
请先重新安装资源|Hãy cài lại tài nguyên trước
正在检查设备字库|Đang kiểm tra phông trên thiết bị
请先安装有效的设备资源|Hãy cài tài nguyên hợp lệ trước
再保存含文字的标注|rồi lưu đánh dấu có chữ
请完成当前更新后重试|Hoàn tất cập nhật hiện tại rồi thử lại
设备未安装字体分区|Chưa cài phân vùng phông
请先安装设备资源|Hãy cài tài nguyên thiết bị trước
设备字库读取失败|Đọc phông thiết bị thất bại
请先修复字体资源|Hãy khôi phục tài nguyên phông trước
当前固件不支持字体即时加载|Phần mềm chưa hỗ trợ nạp phông tức thì
请升级固件后重试|Cập nhật phần mềm rồi thử lại
个缺失字模|chữ còn thiếu
生成期间设备字库已变化|Phông thiết bị đã đổi trong khi tạo chữ
设备未确认旧字库恢复校验通过|Thiết bị chưa xác nhận phông cũ được khôi phục hợp lệ
正在保存新增字模到外置|Đang lưu chữ mới vào bộ nhớ ngoài
正在保存字模|Đang lưu chữ
设备未确认新增字模校验通过|Thiết bị chưa xác nhận kiểm tra chữ mới thành công
字模已提交|Đã ghi xong chữ
继续保存待办|Tiếp tục lưu công việc
正在加载|Đang nạp
字体保存失败|Lưu phông thất bại
正在恢复旧字库|Đang khôi phục phông cũ
旧字库已恢复|Đã khôi phục phông cũ
请重试保存|Hãy lưu lại
不是字体资源包|Không phải gói tài nguyên phông
控制台|Bộ điều khiển
选择固件|Chọn phần mềm
按步骤完成蓝牙升级|Làm theo các bước để cập nhật qua Bluetooth
返回主界面|Về trang điều khiển
升级工作台|Cập nhật phần mềm
先执行环境自检|Kiểm tra môi trường trước
再准备|rồi chuẩn bị
当前流程|Quy trình hiện tại
默认流程|Quy trình mặc định
选择固件包|Chọn gói cập nhật
选择已打包的|Chọn gói đã đóng thành
本地固件文件|Tệp cập nhật trên máy
进入升级模式|Vào chế độ cập nhật
连接正常运行的设备|Kết nối thiết bị đang chạy bình thường
将它重启到|khởi động lại vào
可直接进入下一步|Có thể chuyển sang bước tiếp theo
连接并进入|Kết nối và vào
连接设备并升级|Kết nối thiết bị và cập nhật
按弹窗选择升级目标|Chọn thiết bị cần cập nhật trong hộp thoại
通常为|Thường là
连接后自动传输固件|Tự truyền phần mềm sau khi kết nối
升级过程中请保持设备供电|Giữ nguồn điện ổn định trong khi cập nhật
放弃当前会话|Hủy phiên hiện tại
恢复默认流程|Khôi phục quy trình mặc định
升级状态|Trạng thái cập nhật
固件传输进度|Tiến độ truyền phần mềm
高级传输设置|Thiết lập truyền nâng cao
默认关闭|Mặc định tắt
重启后|Sau khi khởi động lại
地址会改变|địa chỉ sẽ thay đổi
通常无法自动识别|thường không tự nhận diện được
关闭此项可在重启后立即弹出设备选择框|Tắt mục này để hiện hộp chọn thiết bị ngay sau khi khởi động lại
流控分片|Chia gói điều khiển luồng
禁用|Tắt
高速传输|Truyền nhanh
默认|Mặc định
移动端推荐|Khuyến nghị cho điện thoại
高兼容|Tương thích cao
控制设备确认接收数据的间隔|Khoảng xác nhận nhận dữ liệu của thiết bị
连接与升级说明|Hướng dẫn kết nối và cập nhật
进入方式|Cách vào
检测中|Đang kiểm tra
页面跳转不会继承浏览器中的|Trang mới không kế thừa kết nối trong trình duyệt
所以从主界面跳到本页后|Sau khi chuyển từ trang điều khiển đến đây
升级阶段会重新选择应用设备|cần chọn lại thiết bị để cập nhật
如果浏览器尚未持有|Nếu trình duyệt chưa có
授权|quyền truy cập
页面会提示你再次确认|trang sẽ yêu cầu xác nhận lại
本页使用|Trang dùng
官方|chính thức
流程|Quy trình
建议先执行|Nên thực hiện trước
再选择固件包|rồi chọn gói cập nhật
时可跳过步骤|có thể bỏ qua bước
直接连接并升级|Kết nối trực tiếp và cập nhật
记录最近|Ghi lại gần nhất
条操作和传输信息|thao tác và thông tin truyền
便于排查升级问题|để kiểm tra lỗi cập nhật
清空日志|Xóa nhật ký
查看运行记录|Xem nhật ký hoạt động
日志类型|Loại nhật ký
信息|Thông tin
进度|Tiến độ
还没有事项，添加一个定时待办，或导入旧版待办草稿。|Chưa có công việc. Thêm việc hẹn giờ hoặc nhập bản nháp phiên bản cũ.
从上方添加一个重要日期，也可以连接设备读取已有标注。|Thêm ngày quan trọng ở phía trên, hoặc kết nối để đọc đánh dấu có sẵn.
等待资源包|Chờ gói tài nguyên
资源占用尚未确认|Chưa xác nhận dung lượng tài nguyên
连接设备并读取分区，查看资源用量。|Kết nối và đọc phân vùng để xem dung lượng tài nguyên.
星期日|Chủ Nhật
星期一|Thứ Hai
星期二|Thứ Ba
星期三|Thứ Tư
星期四|Thứ Năm
星期五|Thứ Sáu
星期六|Thứ Bảy
资源请求超时|Yêu cầu tài nguyên hết thời gian chờ
资源目录尚未就绪|Thư mục tài nguyên chưa sẵn sàng
连接不可用或请求正在执行|Kết nối không khả dụng hoặc yêu cầu đang được xử lý
资源写入进度确认错误|Xác nhận tiến độ ghi tài nguyên không đúng
资源尾页尚未写入 Flash|Trang cuối tài nguyên chưa được ghi vào flash
资源写入失败|Ghi tài nguyên thất bại
资源目录尚未加载|Chưa nạp thư mục tài nguyên
添加一项定时待办|Thêm một công việc hẹn giờ
从上方添加一项重要日期|Thêm một ngày quan trọng ở phía trên
读取已有标注|Đọc các đánh dấu có sẵn
也可以|Cũng có thể
含每个模块的|Gồm mỗi mô-đun
实际设备用量需连接后读取|Kết nối thiết bị để đọc dung lượng thực tế
系统区和保留区占用未统计|Chưa tính vùng hệ thống và dự phòng
系统区|Vùng hệ thống
按本地资源包估算|Ước tính theo gói trên web
当前显示|Đang hiển thị
当日未完成待办总数|Tổng việc chưa hoàn thành trong ngày
当日未完成事项总数|Tổng việc chưa hoàn thành trong ngày
连接墨水屏后，即可同步时间、传送图片和管理资源。|Kết nối màn hình để đồng bộ giờ, truyền ảnh và quản lý tài nguyên.
选择工具，为图片添加笔迹、文字或课表。|Chọn công cụ để vẽ, thêm chữ hoặc thời khóa biểu vào ảnh.
生成课表后点击单元格编辑，也可粘贴表格。|Sau khi tạo bảng, bấm vào ô để sửa hoặc dán nội dung từ bảng tính.
还没有事项，添加一项定时待办，或导入旧版待办草稿。|Chưa có công việc. Thêm việc hẹn giờ hoặc nhập bản nháp phiên bản cũ.
从上方添加一项重要日期，也可以连接设备读取已有标注。|Thêm ngày quan trọng ở phía trên, hoặc kết nối để đọc đánh dấu có sẵn.
按本地资源包估算，含每个模块的 32 字节包头；实际设备用量需连接后读取。系统区和保留区占用未统计。|Ước tính theo gói trên web, gồm phần đầu 32 byte mỗi mô-đun. Kết nối để đọc dung lượng thực tế; chưa tính vùng hệ thống và dự phòng.
无编译时间戳|Không có thời điểm biên dịch
事项会提前|Công việc sẽ hiện trước
新增日期标注|Thêm đánh dấu ngày
选择日期并设置标注|Chọn ngày và đặt đánh dấu
添加到下方列表|Thêm vào danh sách bên dưới
还没有日期标注|Chưa có đánh dấu ngày
还没有事项|Chưa có công việc
暂无待办|Chưa có công việc
本地包已就绪|Gói tài nguyên đã sẵn sàng
个资源包|gói tài nguyên
数据总大小|Tổng dung lượng dữ liệu
包内模块版本与生成时间|Phiên bản và thời điểm tạo các mô-đun
资源包估算|Ước tính theo gói tài nguyên
估算资源占总容量|Tài nguyên chiếm khoảng
估算余量|Còn trống dự kiến
系统区占用未统计|Chưa tính dung lượng vùng hệ thống
保留区占用未统计|Chưa tính dung lượng vùng dự phòng
保留区|Vùng dự phòng
完整回读|Đọc lại đầy đủ
更新时间|Ngày cập nhật
总版本|Phiên bản chung
横屏|Ngang
竖屏|Dọc
与设备一致|Giống hướng thiết bị
点击课表单元格编辑|Bấm ô thời khóa biểu để sửa
生成课表|Tạo thời khóa biểu
切换到|Chuyển sang
仅显示|Chỉ hiển thị
显示全部蓝牙设备|Hiện tất cả thiết bị Bluetooth
留空只显示红点|Để trống chỉ hiện chấm đỏ
农历仍保留|Giữ lại âm lịch
日历仍保留|Giữ lại lịch
外置|Bộ nhớ ngoài
固件|Phần mềm
工具|Công cụ
图片|Ảnh
课表|Thời khóa biểu
单元格|Ô
草稿|Bản nháp
显示|Hiển thị
读取|Đọc
更新|Cập nhật
时间|Thời gian
大小|Kích thước
数据|Dữ liệu
包内|Trong gói
模块|Mô-đun
估算|Ước tính
余量|Còn trống
占用|Dung lượng dùng
未统计|Chưa tính
实际|Thực tế
本地|Trên web
管理|Quản lý
仍|Vẫn
并|và
后|sau
日|CN
一|2
二|3
三|4
四|5
五|6
六|7
墨水屏控制台|Bộ điều khiển đồng hồ 7.5
跳到设备连接|Đến phần kết nối thiết bị
连接设备|Kết nối thiết bị
让每一屏都恰到好处|Kết nối và điều khiển màn hình của bạn
深色外观|Giao diện tối
深色主题|Giao diện tối
浅色主题|Giao diện sáng
控制台导航|Điều hướng
设备连接|Kết nối thiết bị
图片工作台|Chỉnh sửa và truyền ảnh
待办事项|Việc cần làm
日期标注|Đánh dấu ngày
设备资源|Tài nguyên thiết bị
未连接|Chưa kết nối
连接蓝牙设备后|Sau khi kết nối Bluetooth
自动同步时间并读取设备信息|tự đồng bộ giờ và đọc thông tin thiết bị
重连|Kết nối lại
不过滤设备|Không lọc thiết bị
驱动|Bộ điều khiển
寸低分|inch độ phân giải thấp
寸|inch
黑白红黄蓝绿|đen/trắng/đỏ/vàng/xanh dương/xanh lá
黑白红黄|đen/trắng/đỏ/vàng
黑白红|đen/trắng/đỏ
黑白|đen/trắng
双色|2 màu
三色|3 màu
四色|4 màu
六色|6 màu
引脚|Chân kết nối
确定|Xác nhận
设备电压|Điện áp pin
固件版本|Phiên bản phần mềm
固件升级|Cập nhật phần mềm
连接日志与诊断|Nhật ký kết nối và chẩn đoán
保留最近|Giữ lại gần nhất
条记录|bản ghi
导出日志|Xuất nhật ký
清空|Xóa
蓝牙连接日志|Nhật ký Bluetooth
设备控制|Điều khiển thiết bị
时间同步|Đồng bộ giờ
选择显示模式|Chọn chế độ hiển thị
同时将本机时间同步到墨水屏|đồng thời đồng bộ giờ từ máy này sang đồng hồ
每周起始日|Ngày đầu tuần
周日|Chủ Nhật
周一|Thứ Hai
周二|Thứ Ba
周三|Thứ Tư
周四|Thứ Năm
周五|Thứ Sáu
周六|Thứ Bảy
日历模式|Lịch tháng
全屏待办|Việc cần làm toàn màn
全屏时钟|Đồng hồ toàn màn
清除屏幕|Xóa màn hình
十六进制设备命令|Lệnh thiết bị dạng hex
十六进制命令|Lệnh hex
发送命令|Gửi lệnh
编辑历史|Lịch sử chỉnh sửa
编辑|Chỉnh sửa
预览|Xem trước
发送图片|Gửi ảnh
发送|Gửi
导入图片|Nhập ảnh
调整效果|điều chỉnh hiệu ứng
也可以用画笔|cũng có thể dùng bút vẽ
文字和课表工具直接创作|chèn chữ và tạo thời khóa biểu
选择要编辑的图片|Chọn ảnh cần chỉnh sửa
选择图片|Chọn ảnh
或拖放到这里|hoặc kéo thả vào đây
比例不匹配时自动进入裁剪|Tự cắt khi tỉ lệ ảnh không phù hợp
尚未选择图片|Chưa chọn ảnh
画布尺寸|Kích thước ảnh
颜色模式|Chế độ màu
抖动算法|Thuật toán tạo hạt
无抖动|Không tạo hạt
抖动强度|Mức tạo hạt
对比度|Độ tương phản
重置效果|Đặt lại hiệu ứng
确认间隔|Khoảng xác nhận
传输状态|Trạng thái truyền
画面方向|Hướng ảnh
自动识别中|Đang nhận diện
旋转|Xoay
镜像|Lật gương
左右|trái/phải
上下|trên/dưới
翻转|Lật
清除画布|Xóa nội dung ảnh
下载数组|Tải mảng dữ liệu
下载预览|Tải ảnh xem trước
创作工具|Công cụ chỉnh sửa
画笔与橡皮擦|Bút vẽ và tẩy
画笔|Bút vẽ
橡皮擦|Tẩy
添加文字|Thêm chữ
课程表格内容|Nội dung thời khóa biểu
课程表|Thời khóa biểu
文字|Chữ
撤销|Hoàn tác
重做|Làm lại
选择工具开始创作|Chọn công cụ để bắt đầu
画布上的内容会在切换工具时保留|Nội dung ảnh được giữ khi đổi công cụ
墨水屏图片编辑画布|Vùng chỉnh sửa ảnh
在画布上拖动绘制|Kéo trên ảnh để vẽ
点击可画圆点|bấm để vẽ chấm tròn
橡皮擦将经过的位置涂为白色|tẩy sẽ tô trắng vị trí đi qua
画笔颜色|Màu bút
文字颜色|Màu chữ
黑色|Đen
红色|Đỏ
黄色|Vàng
绿色|Xanh lá
蓝色|Xanh dương
白色|Trắng
画笔粗细|Độ dày bút
橡皮擦大小|Kích thước tẩy
快捷笔刷大小|Cỡ bút nhanh
快捷大小|Cỡ nhanh
文字排版|Trình bày chữ
支持多行文字|Hỗ trợ nhiều dòng
添加后点击画布放置|Thêm rồi bấm vào ảnh để đặt chữ
拖动调整位置|kéo để đổi vị trí
点选已有文字可继续编辑|chọn chữ đã có để sửa tiếp
文字内容|Nội dung chữ
写一句话|Nhập nội dung
也可以换行写一段内容|Có thể xuống dòng để nhập nhiều dòng
默认字体|Phông mặc định
等宽字体|Phông đơn cách
字体槽位|Ô phông
字体|Phông chữ
字号|Cỡ chữ
对齐方式|Căn lề
左对齐|Căn trái
右对齐|Căn phải
居中|Căn giữa
行距|Giãn dòng
字形|Kiểu chữ
粗体|Đậm
加粗|Đậm
斜体|Nghiêng
取消选择|Bỏ chọn
删除文字|Xóa chữ
先设置天数与节数|Đặt số ngày và số tiết
再点击画布单元格填写课程|rồi bấm ô để điền môn học
长内容自动换行|Nội dung dài tự xuống dòng
表格适配当前画布|Bảng được căn theo kích thước ảnh
尚未生成|Chưa tạo
课表标题|Tiêu đề thời khóa biểu
本周课程表|Thời khóa biểu tuần này
可留空|Có thể để trống
常用布局|Bố cục thường dùng
周一至周五|Thứ Hai đến thứ Sáu
完整一周|Cả tuần
自定义|Tùy chỉnh
每周天数|Số ngày mỗi tuần
每天节数|Số tiết mỗi ngày
更新课表|Cập nhật thời khóa biểu
生成|Tạo
适配画布|Vừa khung ảnh
填入示例|Điền mẫu
清空课程|Xóa các môn
移除课表|Bỏ thời khóa biểu
编辑课程|Sửa môn học
课程名称|Tên môn học
教室|Phòng học
教师|Giáo viên
保存单元格|Lưu ô
取消编辑|Hủy sửa
取消|Hủy
增大选中单元格字号|Tăng cỡ chữ ô được chọn
减小选中单元格字号|Giảm cỡ chữ ô được chọn
批量填写课程|Điền nhiều ô
从表格复制课程区域后粘贴|Sao chép vùng môn học trong bảng rồi dán vào đây
每行对应一节课|Mỗi dòng tương ứng một tiết
每列用|Mỗi cột ngăn bằng
分隔|phân cách
依次对应周一至周日|lần lượt từ thứ Hai đến Chủ Nhật
粘贴内容会更新对应单元格|Nội dung dán cập nhật các ô tương ứng
其他课程保留|các ô khác được giữ nguyên
语文|Ngữ văn
数学|Toán
英语|Tiếng Anh
物理|Vật lý
体育|Thể dục
化学|Hóa học
美术|Mỹ thuật
填入课表|Điền vào thời khóa biểu
位置与缩放|Vị trí và kích thước
课表位置和大小|Vị trí và kích thước bảng
课表上移|Dịch bảng lên
课表下移|Dịch bảng xuống
课表左移|Dịch bảng trái
课表右移|Dịch bảng phải
上移|Dịch lên
下移|Dịch xuống
左移|Dịch trái
右移|Dịch phải
放大|Phóng to
缩小|Thu nhỏ
图片裁剪|Cắt ảnh
拖动图片调整位置|Kéo ảnh để chỉnh vị trí
用滚轮或双指缩放|dùng con lăn hoặc hai ngón để thu/phóng
填满画布后点击完成|bấm hoàn tất khi ảnh phủ kín khung
裁剪左移|Dịch trái
裁剪上移|Dịch lên
裁剪下移|Dịch xuống
裁剪右移|Dịch phải
完成裁剪|Hoàn tất cắt ảnh
请先完成图片裁剪|Hãy hoàn tất cắt ảnh trước
选择待办|Chọn việc cần làm
日历或全屏待办|lịch hoặc việc cần làm toàn màn
设置触发和截止时间|đặt giờ xuất hiện và hạn chót
保存后设备离线也会自动更新|Sau khi lưu, thiết bị vẫn tự cập nhật khi không kết nối web
两种布局共用这份清单|Hai bố cục dùng chung danh sách này
事项内容|Nội dung công việc
例如|Ví dụ
完成本周报告|Hoàn thành báo cáo tuần
已用|Đã dùng
字节|byte
中文通常最多 21 字|số ký tự tùy dấu tiếng Việt
中文最多 3 字|Nhãn tối đa 9 byte UTF-8
中文通常最多|Số ký tự phụ thuộc UTF-8, tối đa
中文最多|Tiếng Trung tối đa
触发时间|Giờ bắt đầu
截止时间|Hạn chót
常驻显示|Luôn hiển thị
已完成|Đã hoàn thành
添加事项|Thêm công việc
先添加或更新事项|Thêm hoặc sửa công việc trước
再保存到设备|rồi lưu vào thiết bị
删除和显示设置也需要保存后才会在屏幕上生效|Cần lưu để việc xóa và thiết lập hiển thị có hiệu lực trên màn
屏幕布局|Bố cục màn hình
屏幕显示数量|Số việc hiển thị
显示提前时间|Hiện trước
过期保留时间|Giữ lại sau hạn
事项默认提前|Mặc định hiện trước
分钟出现|phút
触发后方框变红|ô vuông chuyển đỏ khi đến giờ
截止后保留|Sau hạn giữ lại
分钟并加删除线|phút và gạch ngang
再自动隐藏|rồi tự ẩn
保存需要固件|Để lưu cần phần mềm
待办字号|Cỡ chữ công việc
待办字形|Kiểu chữ công việc
当前字号最多显示|Cỡ chữ này hiển thị tối đa
大字号|Chữ lớn
加粗及斜体需要固件|Đậm và nghiêng cần phần mềm
待办字体类型|Phông công việc
设备默认|Mặc định thiết bị
字体列表复用图片文字工具|Danh sách phông dùng chung với công cụ chèn chữ vào ảnh
缺失字形由网页生成并保存到设备|Chữ còn thiếu được web tạo và lưu vào thiết bị
离线也能显示|Có thể hiển thị khi không kết nối
自定义字体需要固件|Phông tùy chỉnh cần phần mềm
加粗及斜体需要|Đậm và nghiêng cần
常驻事项优先|Ưu tiên việc luôn hiển thị
定时事项按触发时间排序|việc hẹn giờ sắp theo giờ bắt đầu
超过显示数量的事项等待空位|Các việc còn lại chờ chỗ trống
前面的事项完成或过期后自动递补|Tự hiện việc tiếp theo khi việc trước hoàn thành hoặc hết hạn
已完成和已过期事项会保留在编辑列表|Việc đã xong/hết hạn vẫn giữ trong danh sách chỉnh sửa
屏幕上隐藏|nhưng ẩn trên màn
每项显示截止时间或常驻标记|Mỗi việc hiện hạn chót hoặc dấu luôn hiện
长标题会换行或省略|Tiêu đề dài sẽ xuống dòng hoặc rút gọn
导入旧版待办|Nhập danh sách phiên bản cũ
导出备份|Xuất bản sao
导入备份|Nhập bản sao
旧版图片待办草稿仍保留|Bản nháp công việc dạng ảnh cũ vẫn được giữ
点击导入会追加到当前清单|Bấm nhập để thêm vào danh sách hiện tại
长内容按字数限制拆分|Nội dung dài được chia theo giới hạn ký tự
容量不足时整批保留|Nếu thiếu dung lượng, giữ nguyên cả đợt
不覆盖当前事项|không ghi đè công việc hiện có
显示预览|Xem trước hiển thị
左待办|Việc bên trái
右日历|lịch bên phải
设备温度未知|Chưa biết nhiệt độ thiết bị
日历预览|Xem trước lịch
模拟时间|Giờ xem thử
现在|Hiện tại
留空使用当前时间|Để trống để dùng giờ hiện tại
时间按网页所在时区设置|Giờ theo múi giờ trình duyệt
切换模式会同步设备时间|Chuyển chế độ sẽ đồng bộ giờ thiết bị
预览为排版示意|Xem trước chỉ minh họa bố cục
缺失字模会在网页生成并随待办保存到设备|Chữ thiếu được tạo trên web và lưu cùng công việc
编辑定时待办事项|Sửa công việc hẹn giờ
读取设备待办|Đọc công việc từ thiết bị
保存到设备|Lưu vào thiết bị
启用待办|Bật việc cần làm
先保存清单|Lưu danh sách trước
再启用所选布局|rồi bật bố cục đã chọn
布局选择只改变预览|Chọn bố cục chỉ thay đổi xem trước
启用后才切换设备|bấm bật mới chuyển thiết bị
全屏待办需要固件|Việc toàn màn cần phần mềm
草稿自动保存在此浏览器|Bản nháp tự lưu trong trình duyệt này
读取设备或导入备份将替换当前草稿|Đọc từ thiết bị hoặc nhập bản sao sẽ thay bản nháp hiện tại
保存到设备后生效|Có hiệu lực sau khi lưu vào thiết bị
用红点提醒重要日期|Dùng chấm đỏ nhắc ngày quan trọng
或加上简短的文字|hoặc thêm nhãn ngắn
先在这里编辑|Chỉnh sửa ở đây trước
再保存到设备日历|rồi lưu vào lịch thiết bị
新增标注|Thêm đánh dấu
同一个日期只保留一条标注|Mỗi ngày chỉ có một đánh dấu
再次添加会更新内容|Thêm lại để cập nhật nội dung
标注日期|Ngày đánh dấu
短标签|Nhãn ngắn
选填|Không bắt buộc
留空仅显示红点|Để trống chỉ hiện chấm đỏ
显示位置|Vị trí hiển thị
日期下方|Dưới ngày
右上角|Góc trên bên phải
标签字号|Cỡ chữ nhãn
跟随日历|Theo lịch
小号|Nhỏ
大号|Lớn
添加标注|Thêm đánh dấu
显示示意|Minh họa hiển thị
单个日期|Một ngày
标注位置示意|Minh họa vị trí nhãn
选择日期|Chọn ngày
农历|Âm lịch
节日|Ngày lễ
红点标记|Chấm đỏ
标签留空时|Khi để nhãn trống
只显示红点|chỉ hiện chấm đỏ
此处示意标注位置|Đây là minh họa vị trí
实际排版以设备日历为准|Bố cục thực tế theo lịch trên thiết bị
同步到设备|Đồng bộ vào thiết bị
添加或更新标注后|Sau khi thêm hoặc sửa đánh dấu
点击保存|bấm lưu
让设备日历应用当前列表|để áp dụng danh sách lên lịch thiết bị
从设备读取|Đọc từ thiết bị
标注列表|Danh sách đánh dấu
尚未添加标注|Chưa có đánh dấu
日期标注列表|Danh sách đánh dấu ngày
已添加的日期标注|Các ngày đã đánh dấu
标注内容|Nội dung nhãn
显示设置|Thiết lập hiển thị
备份与管理|Sao lưu và quản lý
升级旧设备前|Trước khi nâng cấp thiết bị cũ
可导出配置和日期标注作为迁移备份|có thể xuất cấu hình và đánh dấu để sao lưu
导出迁移备份|Xuất bản sao chuyển đổi
清除设备标注|Xóa đánh dấu trên thiết bị
标注显示规则|Quy tắc hiển thị nhãn
短标签最多|Nhãn ngắn tối đa
个字节|byte
通常可输入|Thường nhập được
个汉字或|chữ Trung hoặc
个英文字母|chữ Latin không dấu
缺失字模会在保存时由网页生成并写入设备|Chữ thiếu được tạo và lưu khi bấm lưu
标签显示在日期下方时|Khi nhãn nằm dưới ngày
会替换该日的节日或农历文字|sẽ thay chữ âm lịch hoặc ngày lễ
并显示红点|và hiện chấm đỏ
带有|Có
标记的日期|ở ngày có dấu
红点改到左上角|chấm đỏ chuyển lên góc trên trái
标签显示在右上角时|Khi nhãn ở góc trên phải
保留节日和农历|giữ lại ngày lễ và âm lịch
标签留空时仅显示红点|Nhãn trống chỉ hiện chấm đỏ
当日日期下方为红色背景|Ngày hiện tại có nền đỏ ở phía dưới
请使用白色或黑色标签|Hãy dùng nhãn trắng hoặc đen
红字会与背景重合|Chữ đỏ sẽ trùng màu nền
英文字母使用小号字库|Chữ Latin dùng phông nhỏ
白色标签在白色背景上可能不明显|Nhãn trắng trên nền trắng có thể khó nhìn
连接设备后自动读取标注|Tự đọc đánh dấu sau khi kết nối
较新固件会在外置|Phần mềm mới xác nhận sau khi
写入确认后提示保存成功|ghi dữ liệu thành công
红点避让|Tránh chấm đỏ
需更新设备固件|Cần cập nhật phần mềm thiết bị
旧固件的右上角位置与读取功能取决于支持情况|Phần mềm cũ có thể không hỗ trợ vị trí góc phải và đọc nhãn
选择资源目录|Chọn thư mục tài nguyên
或展开编辑器生成资源包|hoặc mở trình sửa để tạo gói tài nguyên
已有分区表时|Nếu đã có bảng phân vùng
将保留设备配置与日期标注|giữ lại cấu hình và đánh dấu ngày của thiết bị
资源目录|Thư mục tài nguyên
一键烧录|Cài tài nguyên
读取分区|Đọc phân vùng
回读资源|Đọc lại tài nguyên
保存到本地|Lưu về máy
应用并断开连接|Áp dụng và ngắt kết nối
更新完成后自动断开连接|Tự ngắt kết nối sau khi cập nhật xong
强制重写未变化资源|Ghi lại cả tài nguyên không thay đổi
保持蓝牙连接也可切换模式并刷新屏幕|Có thể đổi chế độ và làm mới khi vẫn kết nối Bluetooth
资源写入期间暂停刷新|Tạm dừng làm mới trong khi ghi tài nguyên
断开后时钟继续运行|Đồng hồ tiếp tục chạy sau khi ngắt kết nối
蓝牙按原策略间歇广播|Bluetooth quảng bá gián đoạn theo cơ chế gốc
单张图片仍直接传入屏幕|Ảnh đơn vẫn truyền trực tiếp vào màn
待烧录资源包|Gói tài nguyên chuẩn bị cài
尚未选择|Chưa chọn
或在编辑器中生成资源包|hoặc tạo gói trong trình sửa
即可查看包内版本与容量|để xem phiên bản và dung lượng
待获取|Chưa đọc
总容量|Tổng dung lượng
资源占用|Dung lượng tài nguyên
资源分区余量|Dung lượng còn trống
连接设备读取实际占用|Kết nối để đọc dung lượng thực tế
载入资源包后可查看容量估算|Nạp gói tài nguyên để xem dung lượng dự kiến
设备资源版本|Phiên bản tài nguyên trên thiết bị
等待连接|Chờ kết nối
连接后显示各模块版本和校验状态|Kết nối để xem phiên bản và kết quả kiểm tra các phần
并与待烧录资源包比较|và so với gói chuẩn bị cài
连接设备后自动读取外置|Sau khi kết nối tự đọc bộ nhớ ngoài
分区状态|Trạng thái phân vùng
设备资源传输进度|Tiến độ truyền tài nguyên
完整回读设备资源后|Sau khi đọc đầy đủ tài nguyên thiết bị
可保存为|có thể lưu thành
编辑并生成设备资源|Chỉnh sửa và tạo tài nguyên
日历与布局在网页内生成|Lịch và bố cục được tạo trong web
无需重新编译固件|không cần biên dịch lại phần mềm
先加载模板或资源目录|Nạp mẫu hoặc thư mục tài nguyên trước
再编辑|rồi chỉnh sửa
生成后可直接烧录|Sau khi tạo có thể cài trực tiếp
布局预览显示组件位置|Xem trước hiển thị vị trí các thành phần
不代替屏幕实际排版|không thay thế bố cục thực tế trên màn
加载默认模板|Nạp mẫu mặc định
导入资源工程|Nhập dự án tài nguyên
导出完整工程|Xuất toàn bộ dự án
资源工程|Dự án tài nguyên
日历数据|Dữ liệu lịch
休班日期|Lịch nghỉ/làm bù
文字与年份计算表|chữ và bảng tính năm
表示休假|nghĩa là nghỉ
表示补班|nghĩa là làm bù
修改年份范围时须提供相应农历和节气计算表|Khi đổi dải năm cần cung cấp bảng tính âm lịch và tiết khí tương ứng
默认模板覆盖|Mẫu mặc định dùng cho
休班表为|Bảng nghỉ/làm bù cho
新增文字的缺失字模会由网页自动生成|Web tự tạo chữ còn thiếu cho nội dung mới
日历资源|Tài nguyên lịch
个固定组件的坐标|tọa độ các thành phần cố định
尺寸和字体槽位|kích thước và ô phông
布局资源|Tài nguyên bố cục
预览模式|Chế độ xem trước
分屏|Chia màn
预览布局|Xem bố cục
设备布局示意|Minh họa bố cục thiết bị
替换字模|Thay dữ liệu phông
可选|Không bắt buộc
未选择时保留原字模|Không chọn để giữ phông hiện tại
支持与槽位几何一致的|Hỗ trợ dữ liệu có kích thước phù hợp ô phông
仍需先转换成字模|cần chuyển thành dữ liệu điểm ảnh trước
小字|Chữ nhỏ
中字|Chữ vừa
数字|Chữ số
生成并载入烧录区|Tạo và đưa vào vùng cài
下载资源类型|Loại tài nguyên tải về
出厂配置|Cấu hình xuất xưởng
出厂标注|Đánh dấu xuất xưởng
请加载模板或选择资源目录|Hãy nạp mẫu hoặc chọn thư mục tài nguyên
分区表|Bảng phân vùng
分区|Phân vùng
交流群|Nhóm trao đổi
开发模式|Chế độ nâng cao
网站访问统计|Thống kê truy cập
本站总访问量|Tổng lượt truy cập
访客人数|Số người truy cập
选择蓝牙设备|Chọn thiết bị Bluetooth
刷新扫描|Quét lại
连接蓝牙设备|Kết nối Bluetooth
设备未连接|Thiết bị chưa kết nối
请先连接设备|Hãy kết nối thiết bị trước
蓝牙已断开|Bluetooth đã ngắt
蓝牙连接已变化|Kết nối Bluetooth đã thay đổi
请重新连接|Hãy kết nối lại
请刷新页面后重试|Hãy tải lại trang rồi thử
设备正在更新资源|Thiết bị đang cập nhật tài nguyên
请等待当前设备操作完成|Hãy chờ thao tác hiện tại hoàn tất
设备操作进行中|Thiết bị đang xử lý
正在连接|Đang kết nối
连接失败|Kết nối thất bại
连接超时|Kết nối hết thời gian chờ
获取服务超时|Đọc dịch vụ hết thời gian chờ
正在读取|Đang đọc
正在写入|Đang ghi
正在更新|Đang cập nhật
正在回读|Đang đọc lại
正在应用|Đang áp dụng
正在执行|Đang thực hiện
资源已应用|Đã áp dụng tài nguyên
资源已写入|Đã ghi tài nguyên
资源写入完成|Đã ghi xong tài nguyên
请先选择资源目录|Hãy chọn thư mục tài nguyên trước
正在校验设备资源|Đang kiểm tra tài nguyên thiết bị
跳过未变化的内容|bỏ qua nội dung không đổi
内容一致|Nội dung giống nhau
已跳过|đã bỏ qua
正在保留设备已补充的字模|Đang giữ lại chữ đã bổ sung trên thiết bị
设备字体格式无效|Phông trên thiết bị không hợp lệ
将使用所选字体资源修复|sẽ khôi phục bằng phông đã chọn
资源已载入|Đã nạp tài nguyên
可编辑后生成|có thể chỉnh sửa rồi tạo
新增文字的缺失字模会自动生成|Chữ mới còn thiếu sẽ tự được tạo
正在应用资源|Đang áp dụng tài nguyên
资源回读完成|Đã đọc xong tài nguyên
请重新完整回读后保存|Hãy đọc lại đầy đủ rồi lưu
未安装或未提交|Chưa cài hoặc chưa ghi hoàn tất
未生成迁移备份|Chưa tạo bản sao chuyển đổi
资源包格式或|Định dạng gói tài nguyên hoặc
网页字体模块未加载|Chưa nạp mô-đun phông web
请重新保存|Hãy lưu lại
已保存|Đã lưu
保存成功|Lưu thành công
已确认|Đã xác nhận
已取消|Đã hủy
已取消设备选择|Đã hủy chọn thiết bị
请稍后重试|Hãy thử lại sau
请稍候|Vui lòng chờ
请重试|Hãy thử lại
请等待完成|Hãy chờ hoàn tất
设备已断开连接|Thiết bị đã ngắt kết nối
设备已重启|Thiết bị đã khởi động lại
设备正在重启|Thiết bị đang khởi động lại
自动识别|Tự nhận diện
已就绪|Đã sẵn sàng
设备已处于|Thiết bị đang ở
未找到|Không tìm thấy
不支持的|Không hỗ trợ
不支持|Không hỗ trợ
不可用|Không khả dụng
固件包|Gói cập nhật
开始升级|Bắt đầu cập nhật
继续升级|Tiếp tục cập nhật
升级完成|Cập nhật hoàn tất
升级日志|Nhật ký cập nhật
环境自检|Kiểm tra môi trường
手动选择|Chọn thủ công
设备并继续|thiết bị và tiếp tục
选择设备并升级|Chọn thiết bị và cập nhật
或更新版本|hoặc mới hơn
或更高|hoặc mới hơn
电压过低|Điện áp quá thấp
请升级到|Hãy cập nhật lên
请先升级设备|Hãy cập nhật thiết bị trước
字体需求必须为数组|Yêu cầu phông phải là mảng
待办字体名称无效|Tên phông không hợp lệ
读取范围错误|Phạm vi đọc sai
的整数|là số nguyên
必须为|phải là
的项目数量不正确|số phần tử không đúng
字符编码|Mã ký tự
字节包头|byte phần đầu
版本|Phiên bản
等待空位|Chờ chỗ trống
未触发|Chưa đến giờ
已触发|Đã đến giờ
已过期|Đã hết hạn
更新事项|Cập nhật công việc
项待办|công việc
条待办事项|công việc
添加待办|Thêm công việc
每行输入一项|Mỗi dòng một việc
请输入文字内容|Hãy nhập nội dung
请减小字号|Hãy giảm cỡ chữ
文件|Tệp
下载|Tải về
导入|Nhập
请选择|Hãy chọn
选择|Chọn
步骤|Bước
失败|Thất bại
错误|Lỗi
警告|Cảnh báo
提示|Thông báo
未知|Không rõ
超时|Hết thời gian chờ
异常|Bất thường
完成|Hoàn tất
删除|Xóa
保存|Lưu
恢复|Khôi phục
分钟|phút
未选择|Chưa chọn
未确认|Chưa xác nhận
未读取|Chưa đọc
未扫描到|Chưa quét thấy
正在扫描|Đang quét
扫描完成|Quét hoàn tất
已选择设备|Đã chọn thiết bị
屏幕|Màn hình
时钟|Đồng hồ
日历|Lịch
待办|Công việc
资源|Tài nguyên
组件|Thành phần
布局|Bố cục
模式|Chế độ
配置|Cấu hình
状态|Trạng thái
操作|Thao tác
日期|Ngày
设备|Thiết bị
文本|Văn bản
会话|Phiên truyền
当前|Hiện tại
连接|Kết nối
断开|Ngắt kết nối
保留|Giữ lại
继续|Tiếp tục
重试|Thử lại
等待|Chờ
缺少|Thiếu
超过|Vượt quá
最多|Tối đa
已用|Đã dùng
可用|Khả dụng
校验失败|Kiểm tra không đạt
白|Trắng
黑|Đen
红|Đỏ
小|Nhỏ
大|Lớn
中|Vừa
细|Mảnh
粗|Dày
宽|Rộng
休|Nghỉ
班|Làm
周|Tuần
星期|Thứ
天|ngày
年|năm
月|tháng
项|mục
条|dòng
次|lần
人|người
个|mục
字|ký tự
第|số
共|tổng
至|đến
或|hoặc
与|và
和|và
的|của
后|sau
为|là
使用|Sử dụng
需要|Cần
请点击|Hãy bấm
点击|Bấm
可点击|Có thể bấm
找到|Tìm thấy
检测到|Phát hiện
已导入|Đã nhập
已生成|Đã tạo
已补充|Đã bổ sung
已校验|Đã kiểm tra
已完成|Đã hoàn tất
注意|Lưu ý
上限|Giới hạn
顺时针|Theo chiều kim đồng hồ
未选中|Chưa chọn
应用|Áp dụng
默认白色|Mặc định trắng
文字组|Nhóm chữ
分隔线|Đường phân cách
月历|Lịch tháng
小字号|Chữ nhỏ
大字号|Chữ lớn
字号|Cỡ chữ
字体槽位|Ô phông
微软雅黑|Microsoft YaHei
苹方|PingFang
黑体|Hei (sans-serif)
宋体|Song (serif)
楷体|Kai
微软正黑体|Microsoft JhengHei
新宋体|NSimSun
仿宋|FangSong
幼圆|YouYuan
隶书|LiSu
华文黑体|STHeiti
华文细黑|STXihei
华文楷体|STKaiti
华文宋体|STSong
华文仿宋|STFangsong
华文中宋|STZhongsong
华文琥珀|STHupo
华文新魏|STXinwei
华文隶书|STLiti
华文行楷|STXingkai
方正舒体|FZShuTi
方正姚体|FZYaoti
思源黑体|Noto Sans CJK
思源宋体|Noto Serif CJK
文泉驿微米黑|WenQuanYi Micro Hei
`.trim().split('\n').map(line => line.split('|'));
  const map = new Map(entries);
  const keys = [...map.keys()].filter(s=>!['日','一','二','三','四','五','六'].includes(s)).sort((a,b)=>b.length-a.length);
  const pattern = new RegExp(keys.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gu');
  function translate(value) {
    if (typeof value === 'string') value=value.replace(/(\d{4})\s*年\s*(\d{1,2})\s*月/g,(_,year,month)=>`Tháng ${month}/${year}`);
    if (typeof value !== 'string' || !/[\u3400-\u9fff]/u.test(value)) return value;
    if(map.has(value.trim()))return value.replace(value.trim(),map.get(value.trim()));
    return value.replace(pattern, s => map.get(s)+' ').replace(/ {2,}/g,' ').replace(/ +([，。；：、])/g,'$1')
      .replaceAll('，', ', ').replaceAll('。', '. ').replaceAll('：', ': ').replaceAll('；', '; ').replaceAll('、', ', ');
  }
  function visit(element) {
    if (!element || !element.querySelectorAll) return;
    const skip = 'script,style,textarea,input,pre,code,[contenteditable=true]';
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {acceptNode(node){
      return node.parentElement?.closest(skip) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    }});
    for(let n=walker.nextNode();n;n=walker.nextNode()) {
      const t=present(n.nodeValue); if(t!==n.nodeValue)n.nodeValue=t;
    }
    for(const el of [element,...element.querySelectorAll('[title],[placeholder],[aria-label]')]){
      if(!el.getAttribute)continue;
      for(const name of ['title','placeholder','aria-label']){
        const v=el.getAttribute(name),t=present(v);if(v!==null&&v!==t)el.setAttribute(name,t);
      }
    }
  }
  /* Customer copy is presentation-only. Internal errors, matching strings,
   * protocol identifiers and editable values are never rewritten. */
  function present(value) {
    let text=translate(value);if(typeof text!=='string')return text;
    text=text.replaceAll('（','(').replaceAll('）',')').replaceAll('，',', ').replaceAll('。','. ').replaceAll('；','; ').replaceAll('：',': ');
    text=text.replace(/(?:giống|theo cách của)\s+bản\s+60\.23\.?/gi,'')
      .replace(/bộ web v\d+(?:\.\d+)*/gi,'trang web này')
      .replace(/bộ dữ liệu v\d+(?:\.\d+)*/gi,'dữ liệu đồng hồ')
      .replace(/(?:phần mềm|phiên bản)\s+0x[\da-f]+(?:\s*(?:trở lên|hoặc mới hơn))?/gi,'phần mềm mới')
      .replace(/vào flash ngoài/gi,'vào đồng hồ')
      .replace(/đọc lại tài nguyên/gi,'đọc lại dữ liệu')
      .replace(/\bTODO (?=\d)/g,'Công việc ')
      .replace(/\(\s+/g,'(').replace(/\s+\)/g,')')
      .replace(/quản lý tài nguyên/gi,'quản lý dữ liệu')
      .replace(/Chưa có công việc\. Thêm việc hẹn giờ hoặc nhập bản nháp phiên bản cũ\./g,'Chưa có công việc. Thêm ở phía trên hoặc nhập từ bản sao.');
    if(/^Mỗi việc tối đa 64 byte UTF-8/i.test(text.trim()))return 'Nội dung công việc quá dài. Hãy rút gọn rồi thử lại.';
    return text;
  }
  root.EPDVietnameseUI={translate,present,visit};
  // Canvas labels (image editor, timetable, layout preview) are presentation too.
  if(root.CanvasRenderingContext2D)for(const name of ['fillText','strokeText']){
    const native=root.CanvasRenderingContext2D.prototype[name];
    root.CanvasRenderingContext2D.prototype[name]=function(text,...args){return native.call(this,translate(text),...args);};
  }
  for(const name of ['alert','confirm','prompt']){
    const native=root[name]; if(native)root[name]=function(message,...args){return native.call(root,present(message),...args);};
  }
  function start(){
    document.documentElement.lang='vi';visit(document.documentElement);
    for(const el of document.querySelectorAll('input[type=text],textarea')){
      if(el.value===el.defaultValue && !/^\s*[\[{]/.test(el.value)){
        el.value=translate(el.value);el.defaultValue=el.value;
      }
    }
    const observer=new MutationObserver(records=>{
      observer.disconnect();
      for(const record of records){
        if(record.type==='characterData')visit(record.target.parentElement);
        else if(record.type==='attributes')visit(record.target);
        else for(const n of record.addedNodes) visit(n.nodeType===3?n.parentElement:n);
      }
      observe();
    });
    function observe(){observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label']});}
    observe();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})(globalThis);
