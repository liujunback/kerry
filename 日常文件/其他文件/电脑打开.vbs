msgbox("可以不生气了么？")
msgbox("房产证写你的名")
msgbox("保大")
msgbox("我妈会游泳")
msgbox("工资卡你管")
Dim m
m = MsgBox("可以不生气了么？", vbOKCancel)
If m = vbOK Then MsgBox("爱你么么哒")
If m = vbCancel Then MsgBox"我不喜欢你了"
Dim x
If m = vbCancel Then x = MsgBox("重新问一次，做我女朋友可以吗？", vbOKCancel)
	If x = vbOK Then MsgBox("永远爱你么么哒")
	If x = vbCancel Then MsgBox"哼，我不喜欢你了",vbCritica