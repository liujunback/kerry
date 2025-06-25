import shutil  
import os  



def pdf(name,destination_folder):
    # 源文件路径
    source_file = 'D:\微信文件\WeChat Files\wxid_rkdt6ft7o2yu22\FileStorage\File\\2024-10\\tracking_number\\' + name +".pdf"


    # 确保目标文件夹存在，如果不存在则创建
    if not os.path.exists(destination_folder):
        os.makedirs(destination_folder)

    # 构建目标文件路径（包括文件名）
    destination_file = os.path.join(destination_folder, os.path.basename("SKU-" +name + ".pdf"))

    # 复制文件
    shutil.copy2(source_file, destination_file)

    print(f"文件已成功复制到 {destination_folder}")


test = [
    "DLSXC6578C67982",
    "DLSXC6578B5827A",
    "DLSXC6577C91866",
    "DLSXC6577ACB953",
    "DLSXC657791A010",
    "DLSXC657771BA0B",
    "DLSXC65768437A6",
    "DLSXC657643A863",
    "DLSXC6574C90CCB",
    "DLSXC65748A9CA3",
    "DLSXC6574761B87",
    "DLSXC6572CB3B03",
    "DLSXC65725421AB",
    "DLSXC657253AC84",
    "DLSXC6572535C9A",
    "DLSXC65725354A7",
    "DLSXC6572535302",
    "DLSXC6571C95271",
    "DLSXC6571C36706",
    "DLSXC65717152A6",
    "DLSXC65716CC454",
    "DLSXC6571559602",
    "DLSXC65713535AA"
]
for i in test:
    pdf(i,"C:\\Users\BLiuJ\Desktop\KEC主流程图片")