# -*- coding: utf-8 -*-
# 爬取OLDLee PDF文档,网址：http://www.micaps.cn/MifunForum/post/list?tId=23
# Desmondcb 2017/7/23 真诚感谢OLDLee的分享，气象人都会记住您！

import urllib2
import re
import os

# open the url and read
def getHtml(url):
    page = urllib2.urlopen(url)
    html = page.read()
    page.close()
    return html

# compile the regular expressions and find
# all stuff we need
def getUrl(html):
    reg = r'(?:href|HREF)="?((?:http://)?.+?\.pdf)'
    url_re = re.compile(reg)
    url_lst = re.findall(url_re,html)
    return url_lst

def getFile(url):
    print(url[-20:])
    file_name = url[-23:]
    u = urllib2.urlopen(url)
    f = open(file_name, 'wb')

    block_sz = 8192
    while True:
        buffer = u.read(block_sz)
        if not buffer:
            break
            
        f.write(buffer)
    f.close()
    print("Sucessful to download" + " " + file_name)

#http://www.micaps.cn/forum-upload/ueditor/jsp/upload/file/20170721/1500601297873029950.pdf
root_url = 'http://www.micaps.cn/forum-'

raw_url = 'http://www.micaps.cn/MifunForum/post/list?tId=23'
html = getHtml(raw_url)
url_lst = getUrl(html)

os.mkdir('Desmondcb_download')
os.chdir(os.path.join(os.getcwd(), 'Desmondcb_download'))

for i in range(0,100):
    temp = url_lst[i].split('-')[-1]
    url = root_url + temp
    getFile(url)
