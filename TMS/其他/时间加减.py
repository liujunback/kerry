from PIL import Image, ImageDraw, ImageFont
import barcode
from io import BytesIO

# 单号
tracking_number = "123456789012"  # 注意：这里应该是一个有效的EAN-13单号

# 创建10x15英寸的白色背景图像（假设分辨率为72DPI）
width, height = 720, 1080
background_color = (255, 255, 255)
image = Image.new('RGB', (width, height), background_color)
draw = ImageDraw.Draw(image)

# 设置字体（确保你的系统中有这个字体，或者指定一个存在的字体路径）
try:
    font = ImageFont.truetype("arial.ttf", 24)
except IOError:
    font = ImageFont.load_default()

# 添加文本（单号）
text_position = (50, 50)
draw.text(text_position, f"Tracking Number: {tracking_number}", fill=(0, 0, 0), font=font)

# 生成条形码（使用EAN13类）
from barcode import EAN13  # 从barcode.barcode模块中导入EAN13类
ean = EAN13(tracking_number, writer=None)  # 不需要传入writer参数，因为我们稍后会自己处理图像
barcode_bytes = ean.render()
barcode_image = Image.open(BytesIO(barcode_bytes))

barcode_image = ean.render(writer_options={'add_checksum': False})  # 渲染条形码为图像
# 调整条形码大小以适应面单（这里假设调整为宽300px，高100px）
barcode_width, barcode_height = 300, 100
barcode_image = barcode_image.resize((barcode_width, barcode_height), Image.ANTIALIAS)

# 将条形码粘贴到面单上
barcode_position = (50, 150)  # 条形码位置（左上角坐标）
image.paste(barcode_image, barcode_position)

# 保存面单为图像文件
output_file = "shipping_label.png"
image.save(output_file)

print(f"Shipping label saved as {output_file}")