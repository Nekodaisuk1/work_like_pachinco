const puppeteer = require("puppeteer");

async function runScraper(rawMessage) {
  const { loginId, password, name } = parseMessage(rawMessage); // parse raw message here
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  try {
    //typeのログインページにアクセス
    await page.goto("https://hr.type.jp/#/", { waitUntil: "domcontentloaded" });

    await page.type("#loginId", loginId);
    await page.type("#loginPassword", password);
    await page.click('[data-test="login-button"]');

    //ログイン完了、SPAの描画待機(待機時間動的にしたいけどうまくいかなかったのでこのまま)
    await new Promise(res => setTimeout(res, 2000));

    //応募者一覧のページに遷移
    await page.goto("https://hr.type.jp/#/applicants", { waitUntil: "domcontentloaded" });
    await new Promise(res => setTimeout(res, 2000));

    //応募者名で探索
    const applicantLink = await page.evaluate((targetName) => {
      const normalize = str => str.replace(/\s+/g, "").trim(); // 空白除去
      const rows = Array.from(document.querySelectorAll("tr"));
    
      for (const row of rows) {
        if (normalize(row.textContent).includes(normalize(targetName))) {
          const link = row.querySelector("a[href*='/applicants/']");
          return link?.getAttribute("href") || null;
        }
      }
      return null;
    }, name);    

    if (!applicantLink) throw new Error("応募者詳細ページが見つかりません");

    const detailUrl = `https://hr.type.jp${applicantLink}`;
    //応募者詳細ページへ遷移
    await page.goto(detailUrl, { waitUntil: "domcontentloaded" });
    await new Promise(res => setTimeout(res, 2000));

    const { nameText, phoneText } = await page.evaluate(() => {
    const nameEl = document.querySelector('[data-test="label-name"]');
    const phoneEl = document.querySelector('[data-test="mobile"]');
    return {
      nameText: nameEl?.textContent.trim() || null,
      phoneText: phoneEl?.textContent.trim() || null
    };
  });


    // スクリーンショット（Base64で即返却）
    const buffer = await page.screenshot({ fullPage: true });
    const base64 = buffer.toString("base64");

    return {
      status: "success",
      screenshot: base64,
      mimeType: "image/png",
      name: nameText,
      phone: phoneText
    };
    

  } catch (err) {
    console.error("❌ エラー:", err.message);
    throw err;
  } finally {
    await browser.close();
  }
}

function parseMessage(rawText) {
  // 改行や余分な文字を取り除く
  const cleaned = rawText.replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
  const lines = cleaned.split("\n").map(l => l.trim()).filter(Boolean);

  const nameLine = lines.find(l => l.includes("応募者名"));
  const jobIdLine = lines.find(l => l.includes("応募求人："));
  const loginLine = lines.find(l => l.includes("メールアドレス"));
  const passwordLine = lines.find(l => l.includes("パスワード"));

  const extractValue = (line, sep = "：") => {
    return line ? line.split(sep).pop().replace("様", "").trim() : null;
  };

  const parsed = {
    name: extractValue(nameLine),
    jobId: extractValue(jobIdLine),
    loginId: extractValue(loginLine, ":"),
    password: extractValue(passwordLine, ":"),
  };

  console.log("🧩 parse_message 出力:", parsed);
  return parsed;
}

if (require.main === module) {
  const input = process.argv[2];

  try {
    const parsed = JSON.parse(input);
    parsed.name = "南延香"; 
    runScraper(parsed).then(result => {
      // 🔵 FastAPI 側で受け取るデータ（stdout）
      process.stdout.write(JSON.stringify(result));
    }).catch(err => {
      // 🔴 FastAPI 側には error オブジェクトを stdout で返す
      process.stdout.write(JSON.stringify({ status: "error", message: err.message }));
      process.exit(0); // 明示的に 0 を返すことで「正常終了」扱いに
    });
  } catch (err) {
    // 🔴 パース失敗時も stdout に JSON を出す
    process.stdout.write(JSON.stringify({ status: "error", message: err.message }));
    process.exit(0);
  }
}

module.exports = { runScraper, parseMessage };
