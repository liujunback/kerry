import paramiko
 
# 设置SFTP连接的参数
hostname = 'your.sftp.server.com'
port = 22  # SFTP默认端口是22，如果不是，可以更改
username = 'your_username'
password = 'your_password'
local_file_path = 'path/to/local/file.txt'  # 本地文件路径
remote_file_path = '/path/to/remote/file.txt'  # 远程文件路径
 
# 创建SSH客户端
ssh_client = paramiko.SSHClient()
ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh_client.connect(hostname, port, username, password)
 
# 创建SFTP客户端
sftp_client = ssh_client.open_sftp()
 
# 上传文件
sftp_client.put(local_file_path, remote_file_path)
 
# 关闭SFTP和SSH客户端
sftp_client.close()
ssh_client.close()