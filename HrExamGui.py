#! /usr/bin/env python
# -*-coding:utf-8 -*-

from PyQt4.QtCore import *
from PyQt4.QtGui import *
from PyQt4.QtWebKit import *
from PyQt4.QtNetwork import *

from ui_form import Ui_Form

class HrExamGui(QDialog,Ui_Form):
    loginUrl='http://desktop.ccs.org.cn/x5/portal/login.w' #登录界面URL
    loginUrl2='http://desktop.ccs.org.cn/x5/portal/controller/system/User/login'#登录formURL


    def __init__(self,parent=None):
        super(HrExamGui,self).__init__(parent)

        self.userName=''
        self.password=''

        self.setupUi(self)
        self.setBaseSize(320,480)

        self.userNameEdit.setFocus()
        self.userNameEdit.textChanged.connect(self.adjustLoginButton)
        self.userNameEdit.returnPressed.connect(self.inputPassword)

        self.passwordEdit.textChanged.connect(self.adjustLoginButton)
        self.passwordEdit.returnPressed.connect(self.doLogin)

        self.loginButton.setEnabled(False)
        self.loginButton.clicked.connect(self.doLogin)

        self.webView.loadFinished.connect(self.initialPage)
        self.webView.loadProgress.connect(self.progressBar.setValue)
        self.webView.setUrl(QUrl(HrExamGui.loginUrl))
        self.webView.setContextMenuPolicy(Qt.PreventContextMenu)

        #self.showStatus("请稍等...")

    def showStatus(self, msg):
        self.statusLabel.setText(msg)
        self.stackedWidget.setCurrentIndex(0)

    def showError(self, msg):
        self.progressBar.hide()
        self.showStatus("Error: %s" % msg)

    def document(self):
        return self.webView.page().mainFrame().documentElement()

    def adjustLoginButton(self):
        self.userName = self.userNameEdit.text()
        self.password = self.passwordEdit.text()
        self.loginButton.setEnabled(bool(self.userName and self.password))

    def inputPassword(self):
        if self.userNameEdit.text():
            self.passwordEdit.setFocus()

    def doLogin(self):
        self.userName = self.userNameEdit.text()
        self.password = self.passwordEdit.text()
        if not (self.userName and self.password):
            return

        self.progressBar.setValue(0)
        self.progressBar.show()
        self.webView.loadFinished.connect(self.loginPage)
        self.webView.loadProgress.connect(self.progressBar.setValue)
        self.showStatus("正在登录...")
        #userEmail = self.userName + '@ccs.org.cn'
        self.document().findFirst('#username_input').setAttribute('value', self.userName)
        self.document().findFirst('#password_input').setAttribute('value', self.password)
        self.document().findFirst('#login_button').evaluateJavaScript('this.submit();')

    def initialPage(self,ok):
        pass

    def loginPage(self,ok):
        self.stackedWidget.setCurrentIndex(2)
        self.webView.show()




if __name__ == '__main__':

    import sys

    QTextCodec.setCodecForCStrings(QTextCodec.codecForName('UTF-8'))

    app = QApplication(sys.argv)

    QNetworkProxyFactory.setUseSystemConfiguration(True)

    hr = HrExamGui()
    hr.show()

    sys.exit(app.exec_())