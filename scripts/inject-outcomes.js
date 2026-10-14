import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const OUTCOMES_BY_NUM = {
  '01': {
    svgFileName: 'pr01-outcome.svg',
    translations: {
      ko: {
        title: '3중 여과 숯·모래 원시 정수기 완성 형태',
        description: '나뭇가지 삼각대에 매단 원통 용기 내부에 숯, 고운 모래, 자갈, 섬유 필터가 5중으로 압축 적층되어 상단의 흙탕물이 하단 배출구에서 맑고 투명한 식수로 정수 낙하하는 완성 구조입니다.',
      },
      en: {
        title: 'Completed Stratified Charcoal & Sand Water Purifier',
        description: 'A suspended cylinder packed with 5 distinct layers of charcoal, fine sand, coarse sand, gravel, and fiber filter that clarifies turbid surface water into clear potable water.',
      },
      ja: {
        title: '炭・砂3重ろ過原始浄水器の完成形態',
        description: '木の枝の三脚に吊るした円筒容器の内部に、炭、細砂、砂利、繊維フィルターを多層圧縮充填し、上部の濁水を下部から透明な飲料水へとろ過する完成構造です。',
      },
      es: {
        title: 'Purificador Primitivo de Carbón y Arena Completado',
        description: 'Un cilindro suspendido en un trípode con 5 capas compactadas de carbón, arena y grava que clarifica el agua turbia en agua potable transparente.',
      },
      de: {
        title: 'Vollendeter Schicht-Wasserfilter aus Kohle und Sand',
        description: 'Ein am Dreibein aufgehängter Zylinder mit 5 verdichteten Filterschichten aus Holzkohle, feinem Sand und Kies, der Schlammwasser in klares Trinkwasser umwandelt.',
      },
      pt: {
        title: 'Purificador Primitivo de Carvão e Areia Concluído',
        description: 'Um cilindro suspenso em tripé com 5 camadas compactadas de carvão, areia e cascalho que clarifica água turva em água potável transparente.',
      },
      'zh-TW': {
        title: '木炭細沙三重過濾原始淨水器完成形態',
        description: '懸掛於樹枝三腳架上的圓筒內部，由木炭、細沙、碎石與纖維濾層緊密壓實分層，使上方泥水於下方出水口滴濾為清澈透明的飲用水。',
      },
    },
  },
  '02': {
    svgFileName: 'pr02-outcome.svg',
    translations: {
      ko: {
        title: '보우 드릴 마찰열 발화 및 불씨 착화 완성 형태',
        description: '화판의 45도 V홈에 마찰열로 생성된 검은 숯가루 잉걸불(400°C)이 붉게 타오르며 연기를 피워 올리고, 이를 마른 껍질 부싯깃 둥지로 안전하게 옮겨 불꽃을 피워 올린 실전 발화 완성 상태입니다.',
      },
      en: {
        title: 'Completed Bow Drill Friction Fire & Ember Ignition',
        description: 'A glowing 400°C charcoal ember generated in the 45° V-notch smoking heavily, transferred safely into a dry tinder nest and fanned into an open flame.',
      },
      ja: {
        title: 'ボウドリル摩擦発火および火種着火の完成形態',
        description: '火床板の45度V溝に摩擦熱で生じた黒い炭粉の熾火(400°C)が赤く燃え上がり、これを乾燥した火口の巣に移して炎を立ち上げた実戦発火の完成状態です。',
      },
      es: {
        title: 'Ignición de Brasa por Fricción con Arco Completada',
        description: 'Una brasa incandescente a 400°C generada en la ranura en V, transferida con éxito al nido de yesca seca y avivada hasta producir una llama viva.',
      },
      de: {
        title: 'Vollendete Bogenbohrer-Reibungszündung mit Glut',
        description: 'Eine 400°C heiße Holzkohleglut aus der 45°-V-Kerbe, die sicher in das trockene Zundernest überführt und zu einer offenen Flamme entfacht wurde.',
      },
      pt: {
        title: 'Ignição por Fricção com Arco e Brasa Concluída',
        description: 'Uma brasa incandescente a 400°C gerada na ranhura em V, transferida com sucesso para o ninho de mecha seca e soprada até formar chamas vivas.',
      },
      'zh-TW': {
        title: '弓鑽摩擦生火與火種點燃完成形態',
        description: '火板45度V型槽內藉由摩擦熱生成的400°C黑炭灰餘燼劇烈冒煙，安全轉移至乾燥引火鳥巢並吹拂出明火的實戰生火完成狀態。',
      },
    },
  },
  '03': {
    svgFileName: 'pr03-outcome.svg',
    translations: {
      ko: {
        title: 'A-프레임 데브리 헛 (낙엽 단열 은신처) 완성 외관',
        description: '2.5m 굵은 용마루와 45도 갈비뼈 가지 프레임 위에 1미터 두께의 마른 낙엽층을 압축 적층하고 겉가지 격자를 덮어 강풍과 비바람을 막는 무난방 체온 보존 은신처 완성 외관입니다.',
      },
      en: {
        title: 'Completed A-Frame Debris Hut Thermal Shelter',
        description: 'A 2.5m heavy ridgepole and 45° rib frame blanketed by 1 meter of compressed dry leaves and thatch branches, trapping body heat down to sub-zero temperatures without fire.',
      },
      ja: {
        title: 'Aフレーム・デブリハット（落ち葉断熱シェルター）完成外観',
        description: '太さ2.5mの主棟木と45度の肋骨枝フレームの上に、厚さ1メートルの乾燥落ち葉層を圧縮積層し、強風と風雨を遮断する無暖房体温保持シェルターの完成外観です。',
      },
      es: {
        title: 'Refugio Térmico Debris Hut en Marco A Completado',
        description: 'Una viga maestra de 2.5 m y costillas a 45° cubiertas por 1 metro de hojas secas compactadas y ramas, conservando el calor corporal bajo cero sin fuego.',
      },
      de: {
        title: 'Vollendete A-Rahmen Laub-Notunterkunft (Debris Hut)',
        description: 'Ein massiver 2,5m Dachfirst und ein 45°-Rippenrahmen, umhüllt von einer 1 Meter dicken Schicht aus trockenem Laub, die Körperwärme ohne Feuer speichert.',
      },
      pt: {
        title: 'Abrigo Térmico Debris Hut em Estrutura A Concluído',
        description: 'Uma viga mestra de 2,5m e costelas a 45° cobertas por 1 metro de folhas secas compactadas e galhos, retendo o calor corporal abaixo de zero sem fogo.',
      },
      'zh-TW': {
        title: 'A字型落葉斷熱避難所（Debris Hut）完成外觀',
        description: '2.5米粗壯脊木與45度肋骨支架上覆蓋1米厚的緊實乾落葉層與防風枝條格子網，形成無暖氣下鎖住體溫的野外避難所完成外觀。',
      },
    },
  },
  '04': {
    svgFileName: 'pr04-outcome.svg',
    translations: {
      ko: {
        title: '깬 돌과 칡덩굴 결속 원시 돌도끼 완성 형태',
        description: '단단한 참나무 Y자 자루 홈에 양면 타제된 날카로운 수석 날을 깊숙이 물리고, 질긴 칡덩굴과 송진 접착제로 X자 십자 결속하여 나무를 거침없이 베어 넘기는 실전 석기 돌도끼 완성 형태입니다.',
      },
      en: {
        title: 'Completed Primitive Chipped Stone Axe',
        description: 'A bifacially flaked flint blade seated deeply into a split oak haft, bound firmly with criss-cross vine lashing and sealed with pine pitch resin composite.',
      },
      ja: {
        title: '割り石と葛蔓結束の原始石斧の完成形態',
        description: '硬い樫の木のY字柄の溝に両面打製された鋭利なフリント刃を深く噛み合わせ、強靭な葛蔓と松脂接着剤でX字十字結束した実戦石斧の完成形態です。',
      },
      es: {
        title: 'Hacha Primitiva de Piedra y Liana Completada',
        description: 'Una hoja de pedernal tallada bifacialmente incrustada en un mango de roble hendido, atada firmemente en X con lianas y sellada con resina de pino.',
      },
      de: {
        title: 'Vollendete primitive Steinaxt mit Ast- und Harzbindung',
        description: 'Eine beidseitig geschlagene Feuersteinklinge, tief im gespaltenen Eichenstiel verankert, mit X-Kreuz-Lianenbindung verschnürt und mit Kiefernharz versiegelt.',
      },
      pt: {
        title: 'Machado Primitivo de Pedra e Cipó Concluído',
        description: 'Uma lâmina de sílex lascada bifacialmente encaixada em cabo de carvalho fendido, amarrada firmemente em X com cipós e selada com resina de pinho.',
      },
      'zh-TW': {
        title: '敲石碎屑與葛藤結紮原始石斧完成形態',
        description: '堅韌橡木柄凹槽中深嵌雙面打製鋒利燧石刃，以強韌葛藤與松脂黏合劑進行X型十字結紮，具備砍伐原木威力的實戰石斧完成形態。',
      },
    },
  },
  '05': {
    svgFileName: 'pr05-outcome.svg',
    translations: {
      ko: {
        title: '2가닥 역방향 꼬임 천연 밧줄 완성 코일 다발',
        description: '나무 내피와 칡 줄기 섬유를 시계 방향으로 꼬고 반시계 방향으로 교차 엮어 인장 강도 90kg 이상을 견디는 촘촘하고 매끄러운 2가닥 천연 생존 밧줄 코일 완성 다발입니다.',
      },
      en: {
        title: 'Completed 2-Ply Reverse-Wrapped Natural Cordage Coil',
        description: 'A uniform 8mm braided rope coil made by twisting bast fibers clockwise and counter-wrapping plies, sustaining over 90 kgf tensile load without slipping.',
      },
      ja: {
        title: '2本撚り逆回転編み天然ロープ完成コイル束',
        description: '樹皮の内皮と葛の繊維を時計回りに撚り、反時計回りに交差編みして引張強度90kg以上に耐える、均一で滑らかな2本撚り天然サバイバルロープ束です。',
      },
      es: {
        title: 'Rollo de Cuerda Natural de 2 Cabos con Torsión Inversa Completado',
        description: 'Una bobina de cuerda uniforme de 8 mm trenzada en sentido inverso con fibras de corteza, capaz de resistir más de 90 kgf de carga de tracción.',
      },
      de: {
        title: 'Vollendeter 2-Strang-Naturseilbund mit Gegenverdrallung',
        description: 'Ein gleichmäßiger 8-mm-Seilbund aus im Uhrzeigersinn gedrehten und gegenläufig verzwirnten Bastfasern, der über 90 kgf Zuglast ohne Aufdröseln standhält.',
      },
      pt: {
        title: 'Rolo de Corda Natural de 2 Pernas com Torção Reversa Concluído',
        description: 'Uma bobina de corda uniforme de 8 mm trançada com fibras de casca interna em torção reversa, suportando mais de 90 kgf de tração sem deslizar.',
      },
      'zh-TW': {
        title: '雙股反向搓捻天然繩索完成捲束',
        description: '將樹皮內韌皮與葛藤纖維順時針搓捻、逆時針交叉纏繞，具備90公斤以上抗拉強度的勻稱平滑雙股天然生存繩索捲束完成形態。',
      },
    },
  },
  '06': {
    svgFileName: 'pr06-outcome.svg',
    translations: {
      ko: {
        title: '점토 미장 돌 화덕 (원시 화덕 및 조리구) 완성 형태',
        description: 'U자형 강돌 기초 위에 볏짚과 황토 반죽을 5cm 두께로 매끄럽게 미장하고, 상단 조리용 내열 상판과 후면 배기 굴뚝을 구비하여 650°C 고열을 가두는 원시 화덕 완성 형태입니다.',
      },
      en: {
        title: 'Completed Stone & Tempered Clay Cooking Hearth',
        description: 'A horseshoe stone base sealed under 5cm of straw-tempered refractory clay plaster, featuring a level stone cooktop and rear chimney flue holding intense 650°C heat.',
      },
      ja: {
        title: '粘土左官石かまど（原始かまど及び調理口）完成形態',
        description: 'U字型の川石基礎の上に藁と黄土の練り土を厚さ5cmで滑らかに左官し、上部調理用耐熱天板と後部排気煙突を備えて650°Cの高熱を閉じ込める原始かまどです。',
      },
      es: {
        title: 'Fogón Primitivo de Piedra y Arcilla Revestida Completado',
        description: 'Una base de piedra en herradura sellada con 5 cm de arcilla refractaria templada con paja, con una superficie de cocción nivelada y chimenea trasera a 650°C.',
      },
      de: {
        title: 'Vollendeter Stein- und Lehmofen mit Kochöffnung',
        description: 'Ein hufeisenförmiges Steinfundament, verputzt mit 5 cm strohbasiertem feuerfestem Lehm, mit ebener Stein-Kochplatte und hinterem Abzugskamin für 650°C Hitze.',
      },
      pt: {
        title: 'Fogão Primitivo de Pedra e Argila Revestida Concluído',
        description: 'Uma base de pedra em U selada com 5 cm de argila refratária temperada com palha, com tampa nivelada para cozimento e chaminé traseira que atinge 650°C.',
      },
      'zh-TW': {
        title: '黏土抹面石爐（原始土灶與烹飪口）完成形態',
        description: 'U字型河石地基上均勻抹上5公分厚的稻草黃土灰漿，具備上方平整烹飪石板與後方排煙煙囪，鎖住650°C高溫的原始土灶完成形態。',
      },
    },
  },
  '07': {
    svgFileName: 'pr07-outcome.svg',
    translations: {
      ko: {
        title: '3대 생존 매듭법 야전 텐션 결속 완성 형태',
        description: '기둥에 3초 만에 묶는 말뚝매듭, 강한 하중에도 줄어들지 않고 1초 만에 푸는 보울라인 고리, 팩 텐션을 자유자재로 조절하는 당김매듭, 십자 기둥을 고정하는 사각 결속이 완벽히 조화된 야전 리깅 완성 상태입니다.',
      },
      en: {
        title: 'Completed 3 Survival Knots Field Rigging Assembly',
        description: 'A master field assembly combining the 3-second Clove Hitch, the unshakeable 1-second release Bowline loop, the sliding Taut-line Hitch, and Square Lashing.',
      },
      ja: {
        title: '3大生存結索術の実戦テンション結束完成形態',
        description: '柱に3秒で結べるクローブヒッチ、強荷重でも輪が縮まず1秒で解けるボウライン、テンションを自在に調整するトートラインヒッチ、直交柱を固定する角縛りの完成状態です。',
      },
      es: {
        title: 'Aparejo de Campo con los 3 Nudos de Supervivencia Completado',
        description: 'Un montaje maestro que combina el ballestrinque rápido, el as de guía que no se desliza y se suelta en 1 segundo, el nudo tensor deslizante y el amarre cuadrado.',
      },
      de: {
        title: 'Vollendete Feldverspannung mit den 3 Überlebensknoten',
        description: 'Ein praxiserprobtes Rigg, das den Webeleinenstek, den unverrückbaren und in 1 Sekunde lösbaren Palstek, den verschiebbaren Spannerknoten und die Kreuzbund-Laschung vereint.',
      },
      pt: {
        title: 'Montagem de Campo com os 3 Nós de Sobrevivência Concluída',
        description: 'Uma amarração prática unindo o fiel para ancoragem rápida, o laço de guia que nunca corre e solta em 1 segundo, o nó esticador ajustável e a amarração quadrada.',
      },
      'zh-TW': {
        title: '三大生存繩結實戰張力結紮完成形態',
        description: '立柱上3秒速結的雙半結（丁香結）、承受強大拉力亦不收縮且1秒即解的稱人結、自由調節營釘張力的營繩結，以及固定交叉支柱的十字結紮完美結合的野外架設完成形態。',
      },
    },
  },
};

// 1. Update Master Protocols
const protocolsDir = path.join(rootDir, 'content/protocols');
const masterFiles = fs.readdirSync(protocolsDir).filter((f) => f.endsWith('.json'));

let masterCount = 0;
for (const file of masterFiles) {
  const filePath = path.join(protocolsDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const num = data.protocolId.replace(/[^0-9]/g, '').padStart(2, '0');
  const outcomeDef = OUTCOMES_BY_NUM[num];
  if (outcomeDef) {
    data.outcome = {
      svgFileName: outcomeDef.svgFileName,
      title: outcomeDef.translations.ko.title,
      description: outcomeDef.translations.ko.description,
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    masterCount++;
    console.log(`Updated master ${file} with outcome (${outcomeDef.svgFileName})`);
  }
}

// 2. Update Localized Protocols
const localesDir = path.join(protocolsDir, 'locales');
let localeCount = 0;
if (fs.existsSync(localesDir)) {
  const localeFiles = fs.readdirSync(localesDir).filter((f) => f.endsWith('.json'));
  for (const lFile of localeFiles) {
    const filePath = path.join(localesDir, lFile);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const parts = lFile.replace('.json', '').split('.');
    const lang = parts[parts.length - 1];
    const num = data.protocolId.replace(/[^0-9]/g, '').padStart(2, '0');
    const outcomeDef = OUTCOMES_BY_NUM[num];
    if (outcomeDef && outcomeDef.translations[lang]) {
      data.outcome = {
        svgFileName: outcomeDef.svgFileName,
        title: outcomeDef.translations[lang].title,
        description: outcomeDef.translations[lang].description,
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      localeCount++;
    }
  }
}

console.log(`\nSuccessfully injected outcome into ${masterCount} master files and ${localeCount} localized files.`);
