function doPost(e){
  console.log(e.postData.contents);
  //保存領域を変数に格納
  const props = PropertiesService.getScriptProperties();

  const postData = e.postData.contents;
  const currentData = JSON.parse(props.getProperty("data")|| "[]");
  const newData = JSON.parse(e.postData.contents);
  const flag = parseInt(props.getProperty("flag"||"0"));

  currentData.push(newData);

  props.setProperty("data", JSON.stringify(currentData));
  props.setProperty("flag", flag+1).toString();

  return ContentService.createTextOutput("保存完了"+e.postData.contents+"flag:"+flag+1);
}

function doGet(e){
  const props = PropertiesService.getScriptProperties();
  const currentData = JSON.parse(props.getProperty("data")||[]);
  const flag = parseInt(props.getProperty("flag"||"0"));

  const responce ={
    flag : flag,
    data : currentData
  }

  props.setProperty("flag", "0");

  return ContentService.createTextOutput(JSON.stringify(responce)).setMimeType(ContentService.MimeType.JSON);
}