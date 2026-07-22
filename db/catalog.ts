export type CatalogSeed = {
  id: string; name: string; englishName: string; bar: string; city: string; category: "classic" | "topbar";
  rank?: number; sourceUrl: string; story: string; ingredients: string[]; recipe: string[];
  taste: string; strength: string; minutes: number; price: number; createdAt: number;
};

const IBA = "https://iba-world.com/cocktails/";
const TOP50 = "https://www.theworlds50best.com/stories/News/the-worlds-50-best-bars-2025-the-list.html";

type Row = [string, string, string, string, string, string, string, number];

const classicRows: Row[] = [
  ["americano","美式","Americano","金巴利~30ml;甜味美思~30ml;苏打水~少量","直调","苦甜 · 气泡","轻盈",48],
  ["angel-face","天使之面","Angel Face","金酒~30ml;杏子白兰地~30ml;苹果白兰地~30ml","摇和","果香 · 干爽","偏浓",58],
  ["aviation","航空","Aviation","金酒~45ml;黑樱桃利口酒~15ml;柠檬~15ml;紫罗兰利口酒~5ml","摇和","花香 · 酸爽","中等",58],
  ["between-sheets","床笫之间","Between the Sheets","白朗姆~30ml;干邑~30ml;橙味利口酒~30ml;柠檬~20ml","摇和","柑橘 · 酒香","偏浓",62],
  ["boulevardier","林荫大道","Boulevardier","波本威士忌~45ml;金巴利~30ml;甜味美思~30ml","搅拌","苦甜 · 醇厚","偏浓",62],
  ["brandy-crusta","白兰地柯斯塔","Brandy Crusta","干邑~52ml;橙味利口酒~8ml;黑樱桃利口酒~8ml;柠檬~15ml;糖浆~5ml;苦精~2滴","摇和","柑橘 · 甜润","偏浓",68],
  ["casino","赌场","Casino","金酒~40ml;黑樱桃利口酒~10ml;柠檬~10ml;橙味苦精~2滴","摇和","干爽 · 樱桃","偏浓",58],
  ["clover-club","三叶草俱乐部","Clover Club","金酒~45ml;覆盆子糖浆~15ml;柠檬~15ml;蛋清~少量","摇和","莓果 · 绵密","中等",58],
  ["daiquiri","得其利","Daiquiri","白朗姆~60ml;青柠~20ml;糖浆~10ml","摇和","酸爽 · 甘蔗","中等",52],
  ["dry-martini","干马天尼","Dry Martini","金酒~60ml;干味美思~10ml","搅拌","干爽 · 草本","偏浓",58],
  ["gin-fizz","金菲士","Gin Fizz","金酒~45ml;柠檬~30ml;糖浆~10ml;苏打水~80ml","摇和后补气泡","清爽 · 气泡","轻盈",52],
  ["hanky-panky","花花公子","Hanky Panky","金酒~45ml;甜味美思~45ml;菲奈特~8ml","搅拌","草本 · 苦甜","偏浓",62],
  ["john-collins","约翰柯林斯","John Collins","金酒~45ml;柠檬~30ml;糖浆~15ml;苏打水~60ml","直调","清爽 · 气泡","轻盈",52],
  ["last-word","遗言","Last Word","金酒~23ml;绿查特酒~23ml;黑樱桃利口酒~23ml;青柠~23ml","摇和","草本 · 酸甜","偏浓",68],
  ["manhattan","曼哈顿","Manhattan","黑麦威士忌~50ml;甜味美思~20ml;苦精~1滴","搅拌","醇厚 · 香料","偏浓",62],
  ["martinez","马丁内兹","Martinez","金酒~45ml;甜味美思~45ml;黑樱桃利口酒~5ml;橙味苦精~2滴","搅拌","甜润 · 草本","偏浓",62],
  ["mary-pickford","玛丽碧克馥","Mary Pickford","白朗姆~45ml;菠萝汁~45ml;黑樱桃利口酒~8ml;红石榴糖浆~5ml","摇和","热带 · 果甜","中等",56],
  ["monkey-gland","猴腺","Monkey Gland","金酒~45ml;橙汁~45ml;苦艾酒~少量;红石榴糖浆~5ml","摇和","橙香 · 草本","中等",58],
  ["negroni","内格罗尼","Negroni","金酒~30ml;甜味美思~30ml;金巴利~30ml","搅拌","苦甜 · 柑橘","偏浓",58],
  ["old-fashioned","古典","Old Fashioned","波本威士忌~60ml;方糖~1块;苦精~2滴;水~少量","杯中搅拌","醇厚 · 香料","偏浓",58],
  ["paradise","天堂","Paradise","金酒~35ml;杏子白兰地~20ml;橙汁~15ml","摇和","果香 · 柔和","中等",56],
  ["planters-punch","种植园潘趣","Planter’s Punch","深色朗姆~45ml;橙汁~35ml;菠萝汁~35ml;柠檬~20ml;红石榴糖浆~10ml","摇和","热带 · 浓郁","中等",62],
  ["porto-flip","波特翻转","Porto Flip","白兰地~15ml;红波特酒~45ml;蛋黄~1个","摇和","浓郁 · 甜润","中等",62],
  ["ramos-fizz","拉莫斯菲士","Ramos Fizz","金酒~45ml;柠檬~15ml;青柠~15ml;糖浆~30ml;奶油~60ml;蛋清~少量;苏打水~少量","长摇后补气泡","奶香 · 柑橘","轻盈",68],
  ["rusty-nail","锈钉","Rusty Nail","苏格兰威士忌~45ml;蜂蜜威士忌利口酒~25ml","杯中搅拌","蜂蜜 · 烟熏","偏浓",62],
  ["sazerac","萨泽拉克","Sazerac","干邑~50ml;苦艾酒~10ml;方糖~1块;苦精~2滴","搅拌并洗杯","香料 · 干爽","偏浓",68],
  ["sidecar","边车","Sidecar","干邑~50ml;橙味利口酒~20ml;柠檬~20ml","摇和","柑橘 · 醇厚","偏浓",62],
  ["stinger","毒刺","Stinger","干邑~50ml;白薄荷利口酒~20ml","搅拌","薄荷 · 醇厚","偏浓",62],
  ["tuxedo","燕尾服","Tuxedo","金酒~30ml;干味美思~30ml;黑樱桃利口酒~3ml;苦艾酒~1滴;橙味苦精~2滴","搅拌","干爽 · 草本","偏浓",62],
  ["whiskey-sour","威士忌酸","Whiskey Sour","波本威士忌~45ml;柠檬~30ml;糖浆~15ml;蛋清~少量","摇和","酸甜 · 绵密","中等",56],
  ["alexander","亚历山大","Alexander","干邑~30ml;可可利口酒~30ml;淡奶油~30ml","摇和","可可 · 奶香","中等",58],
  ["bellini","贝里尼","Bellini","普罗塞克~100ml;白桃泥~50ml","直调","蜜桃 · 气泡","轻盈",52],
  ["black-russian","黑色俄罗斯","Black Russian","伏特加~50ml;咖啡利口酒~20ml","杯中搅拌","咖啡 · 甜润","偏浓",52],
  ["bloody-mary","血腥玛丽","Bloody Mary","伏特加~45ml;番茄汁~90ml;柠檬~15ml;伍斯特酱~2滴;辣椒酱~2滴","直调","咸鲜 · 辛香","轻盈",56],
  ["caipirinha","卡皮里尼亚","Caipirinha","卡莎萨~60ml;青柠~1个;白砂糖~4茶匙","捣压直调","酸爽 · 甘蔗","中等",52],
  ["cardinale","红衣主教","Cardinale","金酒~40ml;干味美思~20ml;金巴利~10ml","搅拌","干爽 · 微苦","偏浓",58],
  ["champagne-cocktail","香槟鸡尾酒","Champagne Cocktail","香槟~90ml;干邑~10ml;方糖~1块;苦精~2滴","杯中直调","气泡 · 芳香","轻盈",68],
  ["corpse-reviver-2","亡者复苏二号","Corpse Reviver No.2","金酒~30ml;橙味利口酒~30ml;利莱白~30ml;柠檬~30ml;苦艾酒~少量","摇和","柑橘 · 草本","中等",62],
  ["cosmopolitan","大都会","Cosmopolitan","柑橘伏特加~40ml;橙味利口酒~15ml;青柠~15ml;蔓越莓汁~30ml","摇和","莓果 · 酸甜","中等",56],
  ["cuba-libre","自由古巴","Cuba Libre","白朗姆~50ml;可乐~120ml;青柠~10ml","直调","可乐 · 青柠","轻盈",48],
  ["french-75","法式七五","French 75","金酒~30ml;柠檬~15ml;糖浆~15ml;香槟~60ml","摇和后补气泡","柑橘 · 气泡","轻盈",62],
  ["french-connection","法国连线","French Connection","干邑~35ml;杏仁利口酒~35ml","杯中搅拌","坚果 · 醇厚","偏浓",58],
  ["garibaldi","加里波第","Garibaldi","金巴利~45ml;橙汁~120ml","直调","橙香 · 微苦","轻盈",48],
  ["grasshopper","蚱蜢","Grasshopper","绿薄荷利口酒~30ml;白可可利口酒~30ml;淡奶油~30ml","摇和","薄荷 · 奶香","中等",56],
  ["hemingway-special","海明威特调","Hemingway Special","白朗姆~60ml;西柚汁~40ml;黑樱桃利口酒~15ml;青柠~15ml","摇和","酸爽 · 西柚","中等",58],
  ["horses-neck","马颈","Horse’s Neck","干邑~40ml;姜汁汽水~120ml;苦精~1滴","直调","姜香 · 气泡","轻盈",52],
  ["irish-coffee","爱尔兰咖啡","Irish Coffee","爱尔兰威士忌~50ml;热咖啡~120ml;红糖~10ml;淡奶油~30ml","热调","咖啡 · 奶香","中等",58],
  ["kir","基尔","Kir","干白葡萄酒~90ml;黑加仑利口酒~10ml","直调","浆果 · 清爽","轻盈",48],
  ["long-island","长岛冰茶","Long Island Iced Tea","伏特加~15ml;金酒~15ml;白朗姆~15ml;龙舌兰~15ml;橙味利口酒~15ml;柠檬~25ml;糖浆~20ml;可乐~少量","摇和后补可乐","柑橘 · 强劲","偏浓",68],
  ["mai-tai","迈泰","Mai Tai","牙买加朗姆~30ml;马提尼克朗姆~30ml;橙味利口酒~15ml;青柠~30ml;杏仁糖浆~15ml","摇和","热带 · 坚果","偏浓",62],
  ["margarita","玛格丽特","Margarita","龙舌兰~50ml;橙味利口酒~20ml;青柠~15ml","摇和","酸爽 · 龙舌兰","中等",56],
  ["mimosa","含羞草","Mimosa","橙汁~75ml;香槟~75ml","直调","橙香 · 气泡","轻盈",52],
  ["mint-julep","薄荷朱利普","Mint Julep","波本威士忌~60ml;薄荷~8片;糖浆~10ml","捣压直调","薄荷 · 醇厚","中等",58],
  ["mojito","莫吉托","Mojito","白朗姆~45ml;青柠~20ml;薄荷~8片;白砂糖~2茶匙;苏打水~60ml","捣压直调","薄荷 · 清爽","轻盈",52],
  ["moscow-mule","莫斯科骡子","Moscow Mule","伏特加~45ml;青柠~10ml;姜汁汽水~120ml","直调","姜香 · 气泡","轻盈",52],
  ["pina-colada","椰林飘香","Piña Colada","白朗姆~50ml;椰浆~30ml;菠萝汁~50ml","搅拌机打匀","椰香 · 热带","中等",58],
  ["pisco-sour","皮斯科酸","Pisco Sour","皮斯科~60ml;柠檬~30ml;糖浆~20ml;蛋清~少量;苦精~3滴","摇和","酸甜 · 绵密","中等",58],
  ["sea-breeze","海风","Sea Breeze","伏特加~40ml;蔓越莓汁~120ml;西柚汁~30ml","直调","莓果 · 清爽","轻盈",48],
  ["sex-on-beach","性感沙滩","Sex on the Beach","伏特加~40ml;桃味利口酒~20ml;橙汁~40ml;蔓越莓汁~40ml","直调","果甜 · 清爽","轻盈",52],
  ["singapore-sling","新加坡司令","Singapore Sling","金酒~30ml;樱桃利口酒~15ml;橙味利口酒~8ml;草本利口酒~8ml;菠萝汁~120ml;青柠~15ml;红石榴糖浆~10ml","摇和","热带 · 复杂","中等",68],
  ["tequila-sunrise","龙舌兰日出","Tequila Sunrise","龙舌兰~45ml;橙汁~90ml;红石榴糖浆~15ml","直调","橙香 · 果甜","轻盈",52],
  ["vesper","维斯帕","Vesper","金酒~45ml;伏特加~15ml;利莱白~8ml","摇和","干爽 · 强劲","偏浓",62],
  ["zombie","僵尸","Zombie","深色朗姆~45ml;金色朗姆~45ml;高酒精朗姆~30ml;青柠~20ml;菠萝汁~30ml;百香果糖浆~15ml","摇和","热带 · 强劲","偏浓",72],
  ["barracuda","梭鱼","Barracuda","金色朗姆~45ml;加利安奴~15ml;菠萝汁~60ml;青柠~15ml;普罗塞克~少量","摇和后补气泡","热带 · 气泡","中等",62],
  ["bees-knees","蜜蜂膝盖","Bee’s Knees","金酒~52ml;柠檬~22ml;蜂蜜~22ml","摇和","蜂蜜 · 柑橘","中等",56],
  ["bramble","荆棘","Bramble","金酒~50ml;柠檬~25ml;糖浆~12ml;黑莓利口酒~15ml","摇和后漂浮","莓果 · 酸甜","中等",58],
  ["canchanchara","坎昌查拉","Canchanchara","古巴朗姆~60ml;青柠~15ml;蜂蜜~15ml;水~50ml","直调","蜂蜜 · 青柠","中等",52],
  ["dark-stormy","黑暗风暴","Dark ’N’ Stormy","深色朗姆~60ml;姜汁汽水~100ml;青柠~10ml","直调","姜香 · 甘蔗","中等",56],
  ["espresso-martini","浓缩马天尼","Espresso Martini","伏特加~50ml;咖啡利口酒~20ml;浓缩咖啡~30ml;糖浆~10ml","摇和","咖啡 · 丝滑","中等",58],
  ["french-martini","法式马天尼","French Martini","伏特加~45ml;覆盆子利口酒~15ml;菠萝汁~45ml","摇和","莓果 · 热带","中等",56],
  ["gin-basil-smash","罗勒金酒砸","Gin Basil Smash","金酒~60ml;柠檬~30ml;糖浆~20ml;罗勒~10片","捣压摇和","罗勒 · 酸爽","中等",58],
  ["illegal","非法","Illegal","梅斯卡尔~30ml;白朗姆~15ml;法勒南糖浆~15ml;黑樱桃利口酒~5ml;青柠~22ml;糖浆~15ml","摇和","烟熏 · 酸甜","偏浓",68],
  ["lemon-drop","柠檬滴马天尼","Lemon Drop Martini","伏特加~30ml;橙味利口酒~20ml;柠檬~15ml;糖浆~10ml","摇和","柠檬 · 酸甜","中等",56],
  ["new-york-sour","纽约酸","New York Sour","波本威士忌~60ml;柠檬~30ml;糖浆~22ml;蛋清~少量;红葡萄酒~15ml","摇和后漂浮红酒","酸甜 · 红果","中等",62],
  ["old-cuban","古巴旧梦","Old Cuban","陈年朗姆~45ml;青柠~22ml;糖浆~30ml;薄荷~8片;苦精~2滴;香槟~60ml","摇和后补气泡","薄荷 · 气泡","中等",62],
  ["paloma","帕洛玛","Paloma","龙舌兰~50ml;青柠~10ml;西柚苏打~100ml;海盐~少量","直调","西柚 · 微咸","轻盈",52],
  ["paper-plane","纸飞机","Paper Plane","波本威士忌~30ml;阿佩罗~30ml;阿玛罗~30ml;柠檬~30ml","摇和","苦甜 · 柑橘","中等",62],
  ["penicillin","盘尼西林","Penicillin","苏格兰威士忌~60ml;柠檬~22ml;蜂蜜姜糖浆~22ml;泥煤威士忌~8ml","摇和后漂浮","姜香 · 烟熏","中等",62],
  ["pornstar-martini","激情果马天尼","Porn Star Martini","香草伏特加~45ml;百香果利口酒~15ml;百香果泥~30ml;青柠~15ml;香槟~60ml","摇和并配气泡酒","百香果 · 气泡","中等",68],
  ["russian-spring","俄罗斯春天潘趣","Russian Spring Punch","伏特加~25ml;柠檬~25ml;黑加仑利口酒~15ml;糖浆~10ml;气泡酒~少量","摇和后补气泡","莓果 · 气泡","轻盈",58],
  ["tommys-margarita","汤米玛格丽特","Tommy’s Margarita","龙舌兰~60ml;青柠~30ml;龙舌兰糖浆~15ml","摇和","酸爽 · 龙舌兰","中等",58],
  ["trinidad-sour","特立尼达酸","Trinidad Sour","安格斯图拉苦精~45ml;黑麦威士忌~15ml;柠檬~22ml;杏仁糖浆~30ml","摇和","香料 · 酸甜","偏浓",68],
  ["southside","南区","Southside","金酒~60ml;柠檬~30ml;糖浆~15ml;薄荷~6片","摇和","薄荷 · 柑橘","中等",56],
  ["jungle-bird","丛林鸟","Jungle Bird","黑朗姆~45ml;金巴利~22ml;菠萝汁~45ml;青柠~15ml;糖浆~15ml","摇和","热带 · 苦甜","中等",58],
  ["naked-famous","赤裸名人","Naked and Famous","梅斯卡尔~22ml;黄查特酒~22ml;阿佩罗~22ml;青柠~22ml","摇和","烟熏 · 苦甜","中等",68],
  ["aperol-spritz","阿佩罗气泡","Aperol Spritz","阿佩罗~60ml;普罗塞克~90ml;苏打水~30ml","直调","橙香 · 气泡","轻盈",52],
  ["white-lady","白色佳人","White Lady","金酒~40ml;橙味利口酒~30ml;柠檬~20ml","摇和","柑橘 · 干爽","中等",56],
  ["blood-sand","血与沙","Blood and Sand","苏格兰威士忌~22ml;甜味美思~22ml;樱桃利口酒~22ml;橙汁~22ml","摇和","橙香 · 烟熏","中等",58],
  ["bobby-burns","鲍比伯恩斯","Bobby Burns","苏格兰威士忌~45ml;甜味美思~25ml;草本利口酒~5ml","搅拌","草本 · 醇厚","偏浓",62],
  ["rob-roy","罗伯罗伊","Rob Roy","苏格兰威士忌~50ml;甜味美思~20ml;苦精~2滴","搅拌","醇厚 · 香料","偏浓",58],
  ["el-presidente","总统","El Presidente","白朗姆~45ml;干味美思~25ml;橙味利口酒~10ml;红石榴糖浆~5ml","搅拌","干爽 · 橙香","偏浓",58],
  ["painkiller","止痛药","Painkiller","深色朗姆~60ml;菠萝汁~120ml;橙汁~30ml;椰浆~30ml","摇和","椰香 · 热带","中等",62],
  ["corpse-reviver-1","亡者复苏一号","Corpse Reviver No.1","干邑~30ml;苹果白兰地~30ml;甜味美思~30ml","搅拌","果香 · 醇厚","偏浓",62],
  ["ve-n-to","维内托","Ve.N.To","格拉帕~45ml;柠檬~22ml;蜂蜜~15ml;洋甘菊~15ml;蛋清~少量","摇和","花香 · 酸甜","中等",62],
  ["tipperary","蒂珀雷里","Tipperary","爱尔兰威士忌~50ml;甜味美思~25ml;绿查特酒~15ml;苦精~2滴","搅拌","草本 · 醇厚","偏浓",68],
  ["remember-maine","记住缅因","Remember the Maine","黑麦威士忌~60ml;甜味美思~22ml;樱桃利口酒~8ml;苦艾酒~少量","搅拌","香料 · 樱桃","偏浓",68],
  ["three-dots-dash","三点一线","Three Dots and a Dash","陈年朗姆~45ml;甘蔗烈酒~15ml;青柠~15ml;橙汁~15ml;蜂蜜~15ml;法勒南糖浆~8ml","摇和","热带 · 香料","偏浓",68],
  ["sherry-cobbler","雪莉柯布勒","Sherry Cobbler","雪莉酒~90ml;糖浆~15ml;橙子~3片","摇和","果香 · 清爽","轻盈",52],
  ["suffering-bastard","受难者","Suffering Bastard","干邑~30ml;金酒~30ml;青柠~15ml;苦精~2滴;姜汁汽水~少量","摇和后补气泡","姜香 · 干爽","中等",58],
  ["rabo-de-galo","公鸡尾","Rabo de Galo","卡莎萨~60ml;红味美思~20ml;苦味酒~15ml","搅拌","苦甜 · 甘蔗","偏浓",58],
  ["grand-margarita","皇家玛格丽特","Grand Margarita","龙舌兰~45ml;干邑橙酒~25ml;青柠~25ml","摇和","柑橘 · 醇厚","中等",68],
];

const topBarRows: Array<[...Row, string, number]> = [
  ["leone-roma","罗马街角","Roma Corner","金酒~30ml;甜味美思~30ml;金巴利~25ml;咖啡~5ml","搅拌","苦甜 · 咖啡","偏浓",68,"Bar Leone",1],
  ["leone-limonata","特拉斯提弗柠檬汽水","Trastevere Limonata","金酒~35ml;柠檬~20ml;蜂蜜~10ml;苏打水~80ml","直调","柠檬 · 气泡","轻盈",58,"Bar Leone",1],
  ["handshake-peanut","澄清花生酸","Clear Peanut Sour","威士忌~45ml;柠檬~20ml;蜂蜜~15ml;花生~10g;牛奶~30ml","奶洗澄清","坚果 · 酸甜","中等",72,"Handshake Speakeasy",2],
  ["handshake-pina","丝绸椰林","Silk Colada","朗姆~45ml;菠萝汁~50ml;椰奶~25ml;青柠~10ml","澄清冷却","热带 · 丝滑","中等",72,"Handshake Speakeasy",2],
  ["sips-citrus","地中海气泡","Mediterranean Fizz","金酒~40ml;柠檬~15ml;橙子~20ml;蜂蜜~10ml;苏打水~60ml","摇和后补气泡","柑橘 · 气泡","轻盈",68,"Sips",3],
  ["sips-corn","玉米与味噌","Corn & Miso","波本威士忌~40ml;玉米水~25ml;味噌~3g;柠檬~15ml","澄清冷却","谷物 · 咸鲜","中等",76,"Sips",3],
  ["paradiso-cosmic","宇宙果园","Cosmic Orchard","金酒~35ml;苹果汁~30ml;接骨木花~15ml;柠檬~15ml","摇和","花香 · 果酸","中等",72,"Paradiso",4],
  ["paradiso-volcano","可可火山","Cacao Volcano","朗姆~45ml;可可~10ml;菠萝汁~25ml;青柠~15ml","摇和","可可 · 热带","中等",76,"Paradiso",4],
  ["tayer-coldbrew","午夜冷萃","Midnight Cold Brew","朗姆~40ml;咖啡~35ml;蜂蜜~10ml;椰奶~15ml","摇和","咖啡 · 奶香","中等",68,"Tayēr + Elementary",5],
  ["tayer-rhubarb","大黄高球","Rhubarb Highball","金酒~35ml;大黄~25ml;柠檬~10ml;苏打水~80ml","直调","酸爽 · 气泡","轻盈",62,"Tayēr + Elementary",5],
  ["connaught-martini","梅菲尔马天尼","Mayfair Martini","金酒~55ml;干味美思~10ml;橙味苦精~2滴","搅拌","干爽 · 柑橘","偏浓",78,"Connaught Bar",6],
  ["connaught-bergamot","佛手柑香槟","Bergamot Champagne","伏特加~25ml;佛手柑~15ml;柠檬~10ml;香槟~70ml","直调","花香 · 气泡","轻盈",78,"Connaught Bar",6],
  ["moebius-tomato","番茄白内格罗尼","Tomato White Negroni","金酒~35ml;白味美思~25ml;苦味酒~20ml;番茄水~15ml","搅拌","咸鲜 · 苦甜","偏浓",72,"Moebius Milano",7],
  ["moebius-fig","无花果酸","Fig Sour","威士忌~45ml;无花果~20ml;柠檬~20ml;蛋清~少量","摇和","果甜 · 绵密","中等",72,"Moebius Milano",7],
  ["line-bread","酸面包高球","Sourdough Highball","威士忌~35ml;酸面包糖浆~15ml;柠檬~10ml;苏打水~80ml","直调","谷物 · 气泡","轻盈",68,"Line",8],
  ["line-ferment","发酵梨酸","Fermented Pear Sour","伏特加~40ml;发酵梨汁~35ml;柠檬~15ml;蜂蜜~10ml","摇和","梨香 · 酸甜","中等",68,"Line",8],
  ["jigger-pony","柚子马天尼","Yuzu Martini","金酒~50ml;干味美思~10ml;柚子~10ml","搅拌","柚香 · 干爽","偏浓",68,"Jigger & Pony",9],
  ["jigger-tea","南洋茶潘趣","Nanyang Tea Punch","朗姆~40ml;乌龙茶~35ml;菠萝汁~20ml;青柠~15ml","摇和","茶香 · 热带","中等",68,"Jigger & Pony",9],
  ["tres-monos-mate","马黛茶高球","Mate Highball","威士忌~35ml;马黛茶~45ml;蜂蜜~10ml;苏打水~60ml","直调","茶香 · 气泡","轻盈",62,"Tres Monos",10],
  ["tres-monos-plum","烟熏李子酸","Smoked Plum Sour","威士忌~45ml;李子~25ml;柠檬~15ml;糖浆~10ml","摇和","烟熏 · 果酸","中等",68,"Tres Monos",10],
];

function parseComponents(value: string) {
  const parts = value.split(";").map((part) => part.split("~"));
  return { ingredients: parts.map(([name]) => name), recipe: parts.map(([name, amount]) => `${name} ${amount}`) };
}

export const catalogSeeds: CatalogSeed[] = [
  ...classicRows.map((row, index) => {
    const [id,name,englishName,components,method,taste,strength,price] = row;
    const parsed = parseComponents(components);
    return { id:`classic-${id}`,name,englishName,bar:"IBA 经典配方",city:"经典酒单",category:"classic" as const,sourceUrl:IBA,
      story:"以国际经典结构为基础整理的 HOME/BAR 标准版，适合在熟悉的味道里找到自己的偏好。",
      ingredients:parsed.ingredients,recipe:[...parsed.recipe,`${method}，按杯型出品`],taste,strength,minutes:method.includes("搅拌")?4:5,price,createdAt:1700000000000+index };
  }),
  ...topBarRows.map((row, index) => {
    const [id,name,englishName,components,method,taste,strength,price,bar,rank] = row;
    const parsed = parseComponents(components);
    return { id:`topbar-${id}`,name,englishName,bar:`${bar} 灵感`,city:"2025 世界榜单",category:"topbar" as const,rank,sourceUrl:TOP50,
      story:`取材自 ${bar} 的风味方向，由 HOME/BAR 重新演绎；并非原店官方配方。`,
      ingredients:parsed.ingredients,recipe:[...parsed.recipe,`${method}，按杯型出品`],taste,strength,minutes:5,price,createdAt:1710000000000+index };
  }),
];
