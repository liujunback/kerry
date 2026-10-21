UPDATE `print_template`
SET
  `name` = 'PDA快捷登录二维码',
  `label_type` = 'PDA_LOGIN_QR'
WHERE `label_type` = 'CUSTOM_LABEL'
  AND `name` IN ('自定义lable', '自定义label', 'PDA快捷登录二维码');

UPDATE `print_history`
SET `label_type` = 'PDA_LOGIN_QR'
WHERE `label_type` = 'CUSTOM_LABEL'
  AND `related_type` = 'PDA_LOGIN_QR';
