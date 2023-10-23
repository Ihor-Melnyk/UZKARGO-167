function setPropertyRequired(attributeName, boolValue = true) {
  //обов"язкове
  var attributeProps = EdocsApi.getControlProperties(attributeName);
  attributeProps.required = boolValue;
  EdocsApi.setControlProperties(attributeProps);
}

function setPropertyHidden(attributeName, boolValue = true) {
  //приховане
  var attributeProps = EdocsApi.getControlProperties(attributeName);
  attributeProps.hidden = boolValue;
  EdocsApi.setControlProperties(attributeProps);
}

function setPropertyDisabled(attributeName, boolValue = true) {
  //недоступне
  var attributeProps = EdocsApi.getControlProperties(attributeName);
  attributeProps.disabled = boolValue;
  EdocsApi.setControlProperties(attributeProps);
}

//Скрипт 1. Зміна властивостей атрибутів при створені документа
function onCreate() {
  setCreateProps();
}

function setCreateProps() {
  if (CurrentDocument.inExtId) {
    setPropertyRequired("ApplicationKind");
    setPropertyRequired("MakingСhanges");
    setPropertyRequired("TelephoneContactPerson");
    setPropertyRequired("Branch");
    setPropertyRequired("Agreeable");
    setPropertyRequired("Table");
    setPropertyRequired("Department");
    setPropertyRequired("RegNumber");
    setPropertyRequired("RegDate");
    setPropertyRequired("Registraion");
  }
}

function onTaskExecuteVerifyApplication() {
  debugger;
  if (routeStage.executionResult == "executed") {
    if (!EdocsApi.getAttributeValue("RegNumber").value)
      throw `Не заповнено значення поля "Реєстраційний номер"`;
    if (!EdocsApi.getAttributeValue("RegDate").value)
      throw `Не заповнено значення поля "Реєстраційна дата"`;
    if (!EdocsApi.getAttributeValue("Registraion").value)
      throw `Не заповнено значення поля "Реєстрація"`;
  }
}

//Скрипт 2. Зміна властивостей атрибутів після виконання завдання
function onCardInitialize() {
  VerifyApplicationTask();
  EnterResultsTask();
  ReceiptFundsTask();
  EnterActResultTask();
}

function VerifyApplicationTask() {
  debugger;
  var stateTask = EdocsApi.getCaseTaskDataByCode("VerifyApplication").state;
  if (stateTask == "completed") {
    setPropertyDisabled("ApplicationKind");
    setPropertyDisabled("MakingСhanges");
    setPropertyDisabled("TelephoneContactPerson");
    setPropertyDisabled("Branch");
    setPropertyDisabled("Agreeable");
    setPropertyDisabled("RegNumber");
    setPropertyDisabled("RegDate");
    setPropertyDisabled("Registraion");
  } else {
    setPropertyDisabled("ApplicationKind", false);
    setPropertyDisabled("MakingСhanges", false);
    setPropertyDisabled("TelephoneContactPerson", false);
    setPropertyDisabled("Branch", false);
    setPropertyDisabled("Agreeable", false);
    setPropertyDisabled("RegNumber", false);
    setPropertyDisabled("RegDate", false);
    setPropertyDisabled("Registraion", false);
  }
}

//Скрипт 4. Автоматичне визначення email контактної особи Замовника
function setContractorRPEmailOnCreate() {
  if (CurrentDocument.inExtId) {
    var atr = EdocsApi.getInExtAttributes(
      CurrentDocument.id.toString()
    )?.attributeValues;
    if (atr)
      EdocsApi.setAttributeValue({
        code: "ContractorRPEmail",
        value: EdocsApi.findElementByProperty("code", "ContractorRPEmail", atr)
          ?.value,
        text: null,
      });
  }
}

//Скрипт 5. Передача результату опрацювання документа в ESIGN та коментаря про реєстрацію документа
function onTaskExecuteVerifyApplication(routeStage) {
  if (routeStage.executionResult == "executed") {
    sendComment();
  }
  sendCommand(routeStage);
}

function sendCommand(routeStage) {
  debugger;
  var command;
  var comment;
  if (routeStage.executionResult == "executed") {
    command = "CompleteTask";
  } else {
    command = "RejectTask";
    comment = routeStage.comment;
  }
  var signatures = EdocsApi.getSignaturesAllFiles();
  var DocCommandData = {
    extSysDocID: CurrentDocument.id,
    extSysDocVersion: CurrentDocument.version,
    command: command,
    legalEntityCode: EdocsApi.getAttributeValue("HomeOrgEDRPOU").value,
    userEmail: EdocsApi.getEmployeeDataByEmployeeID(CurrentUser.employeeId)
      .email,
    userTitle: CurrentUser.fullName,
    comment: comment,
    signatures: signatures,
  };

  routeStage.externalAPIExecutingParams = {
    externalSystemCode: "ESIGN1", // код зовнішньої системи
    externalSystemMethod: "integration/processDocCommand", // метод зовнішньої системи
    data: DocCommandData, // дані, що очікує зовнішня система для заданого методу
    executeAsync: false, // виконувати завдання асинхронно
  };
}

function sendComment() {
  debugger;
  var orgCode = EdocsApi.getAttributeValue("OrgCode").value;
  var orgShortName = EdocsApi.getAttributeValue("OrgShortName").value;
  if (!orgCode || !orgShortName) {
    return;
  }
  var comment = `Ваше звернення прийнято та зареєстровано № ${
    EdocsApi.getAttributeValue("RegNumber").value
  } від ${moment(new Date(EdocsApi.getAttributeValue("RegDate").value)).format(
    "DD.MM.YYYY"
  )}`;
  var methodData = {
    extSysDocId: CurrentDocument.id,
    eventType: "CommentAdded",
    comment: comment,
    partyCode: orgCode,
    userTitle: CurrentUser.name,
    partyName: orgShortName,
    occuredAt: new Date(),
  };
  EdocsApi.runExternalFunction(
    "ESIGN1",
    "integration/processEvent",
    methodData
  );
}

//Скрипт 6. Зміна властивостей атрибутів
function EnterResultsTask() {
  debugger;
  var stateTask = EdocsApi.getCaseTaskDataByCode("EnterResults")?.state;

  if (
    stateTask == "assigned" ||
    stateTask == "inProgress" ||
    stateTask == "delegated"
  ) {
    setPropertyRequired("ResultMeeting");
    setPropertyHidden("ResultMeeting", false);
    setPropertyDisabled("ResultMeeting", false);
  } else if (stateTask == "completed") {
    setPropertyRequired("ResultMeeting");
    setPropertyHidden("ResultMeeting", false);
    setPropertyDisabled("ResultMeeting");
  } else {
    setPropertyRequired("ResultMeeting", false);
    setPropertyHidden("ResultMeeting");
    setPropertyDisabled("ResultMeeting", false);
  }
}

function onTaskExecuteEnterResults(routeStage) {
  debugger;
  if (routeStage.executionResult == "executed") {
    if (!EdocsApi.getAttributeValue("ResultMeeting").value)
      throw `Внесіть значення в поле "Результат розгляду Звернення Комісією"`;
  }
}

//Скрипт 7. Зміна властивостей атрибутів
function ReceiptFundsTask() {
  debugger;
  var stateTask = EdocsApi.getCaseTaskDataByCode(
    "ReceiptFunds" + EdocsApi.getAttributeValue("Sections").value
  )?.state;

  if (
    stateTask == "assigned" ||
    stateTask == "inProgress" ||
    stateTask == "delegated"
  ) {
    setPropertyRequired("StatusInvoice");
    setPropertyHidden("StatusInvoice", false);
    setPropertyDisabled("StatusInvoice", false);
  } else if (stateTask == "completed") {
    setPropertyRequired("StatusInvoice");
    setPropertyHidden("StatusInvoice", false);
    setPropertyDisabled("StatusInvoice");
  } else {
    setPropertyRequired("StatusInvoice", false);
    setPropertyHidden("StatusInvoice");
    setPropertyDisabled("StatusInvoice", false);
  }
}

function onTaskExecuteReceiptFunds(routeStage) {
  debugger;
  if (routeStage.executionResult == "executed") {
    if (!EdocsApi.getAttributeValue("StatusInvoice").value)
      throw `Внесіть значення в поле "Статус оплати Замовником"`;
  }
}

//Скрипт 8. Зміна властивостей атрибутів
function EnterActResultTask() {
  debugger;
  var stateTask = EdocsApi.getCaseTaskDataByCode("EnterActResult")?.state;

  if (
    stateTask == "assigned" ||
    stateTask == "inProgress" ||
    stateTask == "delegated"
  ) {
    setPropertyRequired("ActMeetingResult");
    setPropertyHidden("ActMeetingResult", false);
    setPropertyDisabled("ActMeetingResult", false);
  } else if (stateTask == "completed") {
    setPropertyRequired("ActMeetingResult");
    setPropertyHidden("ActMeetingResult", false);
    setPropertyDisabled("ActMeetingResult");
  } else {
    setPropertyRequired("ActMeetingResult", false);
    setPropertyHidden("ActMeetingResult");
    setPropertyDisabled("ActMeetingResult", false);
  }
}

function onTaskExecuteEnterActResult(routeStage) {
  debugger;
  if (routeStage.executionResult == "executed") {
    if (!EdocsApi.getAttributeValue("ActMeetingResult").value)
      throw `Внесіть значення в поле "Результат розгляду акту комісією"`;
  }
}

//Скрипт 6. Визначення ролі за розрізом
function setSections() {
  debugger;
  var Branch = EdocsApi.getAttributeValue("Branch");
  if (Branch.value) {
    var Sections = EdocsApi.getAttributeValue("Sections");
    var BranchData = EdocsApi.getOrgUnitDataByUnitID(Branch.value);
    if (Sections.value != BranchData.unitName) {
      Sections.value = BranchData.unitName;
      EdocsApi.setAttributeValue(Sections);
    }
  }
}

function onChangeBranch() {
  setSections();
}

function onBeforeCardSave() {
  setSections();
}
