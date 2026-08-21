(function () {
  'use strict';
  var rows = [
    ['nonlife','메리츠화재','1566-7711','1577-7711','0505-021-3400','meritz','https://www.meritzfire.com/'],
    ['nonlife','삼성화재','1588-5114','1566-0553','0505-162-0872','samsung-fire','https://www.samsungfire.com/'],
    ['nonlife','DB손해보험','1588-0100','1566-0757','0505-181-4862','db-insurance','https://www.idbins.com/'],
    ['nonlife','KB손해보험','1544-0114','1544-0019','0505-136-6500','kb-insurance','https://www.kbinsure.co.kr/'],
    ['nonlife','현대해상','1588-5656','1577-3223','0507-774-6060','hyundai-marine','https://www.hi.co.kr/'],
    ['nonlife','한화손해보험','1566-8000','1670-1882','0502-779-1004','hanwha-general','https://www.hwgeneralins.com/'],
    ['nonlife','롯데손해보험','1588-3344','1600-5182','0507-333-9999','lotte','https://www.lotteins.co.kr/'],
    ['nonlife','흥국화재','1688-1688','1688-6997','0504-800-0700','heungkuk-fire','https://www.heungkukfire.co.kr/'],
    ['nonlife','하나손해보험','1566-3000','1566-3000','0505-152-0698','hana-insurance','https://www.hanainsure.co.kr/'],
    ['nonlife','NH농협손해보험','1644-9000','1644-9600','0505-060-7000','nh-fire','https://www.nhfire.co.kr/'],
    ['nonlife','MG손해보험','1588-5959','1577-3777','0505-088-1646','mg','https://www.mggeneralins.com/'],
    ['nonlife','CHUBB 에이스손해보험','1566-5800','1833-9513','정보 없음','chubb','https://www.chubb.com/kr-ko/'],
    ['nonlife','AIG손해보험','1544-2792','1544-2792','02-2011-4607','aig','https://www.aig.co.kr/'],
    ['nonlife','AXA손해보험','1566-1566','정보 없음','정보 없음','axa','https://www.axa.co.kr/'],
    ['life','한화생명','1588-6363','1800-6633','정보 없음','hanwha-life','https://www.hanwhalife.com/'],
    ['life','교보생명','1588-1001','1588-1636','정보 없음','kyobo','https://www.kyobo.com/'],
    ['life','삼성생명','1588-3114','1588-3115','정보 없음','samsung-life','https://www.samsunglife.com/'],
    ['life','라이나생명','1588-0058','1588-2442','02-6944-1200','lina','https://www.lina.co.kr/'],
    ['life','KDB생명','1588-4040','1588-4040','02-2669-7939','kdb','https://www.kdblife.co.kr/'],
    ['life','DGB생명','1588-4770','1588-4770','0505-083-5420','dgb','https://www.imlifeins.co.kr/'],
    ['life','미래에셋생명','1588-0220','1588-0220','정보 없음','mirae','https://life.miraeasset.com/'],
    ['life','신한라이프','1588-5580','1522-2285','정보 없음','shinhan','https://www.shinhanlife.co.kr/'],
    ['life','KB라이프','1588-3374','1566-2730','02-6220-9912','kb-life','https://www.kblife.co.kr/'],
    ['life','DB생명','1588-3131','02-6470-7663','0505-129-3134','db-life','https://www.idblife.com/'],
    ['life','하나생명','1577-1112','1577-1112','정보 없음','hana-life','https://www.hanalife.co.kr/'],
    ['life','흥국생명','1588-2288','1877-7006','정보 없음','heungkuk-life','https://www.heungkuklife.co.kr/'],
    ['life','ABL생명','1588-6500','1566-1002','정보 없음','abl','https://www.abllife.co.kr/'],
    ['life','IBK연금보험','1577-4117','02-2270-1661','02-2270-1577','ibk','https://www.ibki.co.kr/'],
    ['life','NH농협생명','1544-4000','1544-4422','02-6971-6040','nh-life','https://www.nhlife.co.kr/'],
    ['life','MetLife','1588-9600','1588-9600','정보 없음','metlife','https://www.metlife.co.kr/'],
    ['life','CHUBB라이프','1599-4600','1599-4600','02-3480-7801','chubb-life','https://www.chubblife.co.kr/'],
    ['life','푸본현대생명','1577-3311','정보 없음','0505-106-0311','fubon','https://www.fubonhyundai.com/'],
    ['life','BNP파리바카디프생명','1688-1118','1688-1118','정보 없음','bnp','https://www.cardif.co.kr/'],
    ['life','AIA생명','1588-9898','1588-2513','02-2021-4540','aia','https://www.aia.co.kr/']
  ];
  window.OS_WORKSTATION_CARRIERS = rows.map(function (row) {
    return { type: row[0], name: row[1], customer: row[2], monitoring: row[3], claim: row[4], logo: '/insubriefing/workstation/carriers/logos/' + row[5] + '.png', homepageUrl: row[6], systemUrl: '' };
  });
})();
