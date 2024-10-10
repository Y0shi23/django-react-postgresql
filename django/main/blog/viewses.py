from django.shortcuts import render
from django.views import View

from collections import OrderedDict
from datetime import datetime
from zoneinfo import ZoneInfo

class IndexView(View):

    def get(self, request):
        datetime_now = datetime.now(ZoneInfo("Asia/Tokyo")).strftime("%Y年%m月%d日 %H:%M:%s")
        return render(
            request, "blog/index.html", {"datetime_now" : datetime_now}
        )

# インデックスビューを呼び出し可能にする
index = IndexView.as_view()
