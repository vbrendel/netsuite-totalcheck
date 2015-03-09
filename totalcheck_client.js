/*
  TotalCheck Client
  Address completion for NetSuite entities:
  * Customer
  * Vendor
  * Lead
  * Prospect
  * Contact
  * Supplier
  * Partner
  * Employee

  Copyright 2011 Brendel IT Services

  Author: Vincent Brendel
  Version: 1.0
  Released: 23 Oct 2011
  
  requires scripts: jquery.1.6.2.min.js, jquery-ui-1.8.16.custom.min.js
  
  Set these parameters:
  * custscript_totalcheck_css_url: the URL to jquery-ui-1.8.16.custom.min.js file
  * custscript_totalcheck_spinner_url: the URL to a 16x16 animating loader image
  
*/

var proxyUrl = null;
var spinnerUrl = null;

if (nlapiGetRecordType() == "customer" || nlapiGetRecordType() == "vendor" || nlapiGetRecordType() == "lead" || nlapiGetRecordType() == "prospect" || nlapiGetRecordType() == "contact" || nlapiGetRecordType() == "partner" || nlapiGetRecordType() == "supplier" || nlapiGetRecordType() == "employee") {
  var bundleId = '17815';
  //var bundleId = null;
  if (bundleId == null || bundleId == '') {
    addJavaScript('/core/media/media.nl?id=262&c=TSTDRV582240&h=95e1e01644bed8b48545&_xt=.js');
    addJavaScript('/core/media/media.nl?id=263&c=TSTDRV582240&h=fa4d84af3b4d012ed954&_xt=.js');
    addStyleSheet('/core/media/media.nl?id=264&c=TSTDRV582240&h=e07b677eb0e7738763bf&_xt=.css');
    spinnerUrl = '/core/media/media.nl?id=265&c=TSTDRV582240&h=f783b7b8e12793443b75';
  } else {
    var baseUrl = '/c.' + nlapiGetContext().getCompany() + '/suitebundle' + bundleId + '/';
    addJavaScript(baseUrl + 'jquery-1.6.2.min.js');
    addJavaScript(baseUrl + 'jquery-ui-1.8.16.custom.min.js');
    addStyleSheet(baseUrl + 'jquery-ui-1.8.16.custom.css');
    spinnerUrl = baseUrl + 'TotalCheck_spinner.gif';
  }
}


function pageInit()
{
  if (nlapiGetRecordType() == "customer" ||
    nlapiGetRecordType() == "vendor" ||
    nlapiGetRecordType() == "lead" ||
    nlapiGetRecordType() == "prospect" ||
    nlapiGetRecordType() == "contact" ||
    nlapiGetRecordType() == "partner" ||
    nlapiGetRecordType() == "supplier" ||
    nlapiGetRecordType() == "employee") {

    proxyUrl = nlapiResolveURL('SUITELET', 'customscript_totalcheck_proxy', 'customdeploy1');
    
    initTotalCheckForm();
  }
}

function initTotalCheckForm() {
  $('head').append('<style> .ui-autocomplete { z-index: 9999 !important; } </style>');

  $("#companyname").autocomplete({
    source: function(request, response) {
      $('#companyname').css('background', 'no-repeat right url(' + spinnerUrl + ')');
      url = proxyUrl + '&call=name&type=Business&term=' + request.term;
      $.getJSON(url + '&callback=?', function(data) {
        $('#companyname').css('background', '');
        response(data);
      });
    },
    select: function(event, ui) {
      nlapiSetFieldValue('companyname', ui.item.value);
      if (totalcheckNameType() == 'Business') {
        $("#totalcheck_complete").val('');
        $("#totalcheck_complete").focus();
        $("#totalcheck_complete").trigger('keydown');
      }
      return false;
    }
  });

  $("#lastname").autocomplete({
    source: function(request, response) {
      $('#lastname').css('background', 'no-repeat right url(' + spinnerUrl + ')');
      url = proxyUrl + '&call=name&type=Residential&term=' + request.term;
      $.getJSON(url + '&callback=?', function(data) {
        $('#lastname').css('background', '');
        response(data);
      });
    },
    select: function(event, ui) {
      nlapiSetFieldValue('lastname', ui.item.value);
      $("#totalcheck_complete").val('');
      $("#totalcheck_complete").focus();
      $("#totalcheck_complete").trigger('keydown');
      return false;
    }
  });

  if (nlapiGetRecordType() == "employee" || nlapiGetRecordType() == "contact") {
    row = $('#lastname_fs').parent().parent();
  } else {
    row = $('#companyname_fs').parent().parent();
  }

  row.after('<tr style="display:none" id="totalcheck_select"><td valign=middle nowrap align=right class="smallgraytextnolink">Select Address&nbsp;</td><td id="totalcheck_address_list"></td></tr>');
  row.after('<tr><td valign=middle nowrap align=right class="smallgraytextnolink">TotalCheck Input&nbsp;</span></td><td nowrap valign=middle><span class="effectstatic"><input id="totalcheck_complete" class="input" type="text" size="3"></span></td></rt>');

  if (nlapiGetRecordType() == "employee" || nlapiGetRecordType() == "contact") {
    $("#totalcheck_complete").css('width', $("input[name=phone]").css('width'));
  } else {
    $("#totalcheck_complete").css('width', $("#companyname").css('width'));
  }
  
  $("#totalcheck_complete").autocomplete({
    minLength: 0,
    source: function(request, response) {
      $('#totalcheck_complete').css('background', 'no-repeat right url(' + spinnerUrl + ')');
      url = proxyUrl + '&call=suggest&name=' + totalcheckName() + '&type=' + totalcheckNameType() + '&term=' + request.term;
      $.getJSON(url + '&callback=?', function(data) {
        $('#totalcheck_complete').css('background', '');
        response(data);
      });
    },
    select: function(event, ui) {
      $('#totalcheck_complete').css('background', 'no-repeat right url(' + spinnerUrl + ')');
      url = proxyUrl + '&call=select&name=' + totalcheckName() + '&type=' + totalcheckNameType() + '&suggestion=' + ui.item.suggestion;
      $.getJSON(url + '&callback=?', function(data) {
        $('#totalcheck_complete').css('background', '');
        selectAddresses(data);
      });
    }
  });
}

var manualChange = true;

function fieldChanged(type, fld, line) {
  if (type == 'addressbook') {
    if (fld == 'label') {
      manualChange = true;
    }
  
    if (fld == 'addr1' || fld == 'addr2' || fld == 'addr3' || fld == 'city' || fld == 'zip' || fld == 'state' || fld == 'country') {
      if (manualChange) {
        if ((/DPID:/).test(nlapiGetCurrentLineItemValue('addressbook', 'label'))) {
          nlapiSetCurrentLineItemValue('addressbook', 'label', '');
        }
      }
    }
  }
}

function lineInit(type) {
  manualChange = false;
}

function addStyleSheet(sheet)
{
  if (document.createStyleSheet) {
    document.createStyleSheet(sheet);
  } else {
    var newSS = document.createElement('link');
    newSS.rel = 'stylesheet';
    newSS.href = sheet;
    document.getElementsByTagName("head")[0].appendChild(newSS);
  }
}

function addJavaScript(script)
{
	var oHead = document.getElementsByTagName('HEAD').item(0);
  var oScript= document.createElement("script");
  oScript.type = "text/javascript";
  oScript.src = script;
  oHead.appendChild(oScript);
}

function totalcheckName() {
  if (totalcheckNameType() == "Residential") {
    return nlapiGetFieldValue('lastname');
  } else {
    return nlapiGetFieldValue('companyname');
  }
}

function totalcheckNameType() {
  if (nlapiGetRecordType() == "employee" || nlapiGetRecordType() == "contact" || $('input[name=isperson]:checked').val() == "T") {
    return 'Residential';
  } else {
    return 'Business';
  }
}

var currentAddresses = null;
var addressInfo = null;

function showAddress(i) {
  applyAddress(currentAddresses[i], addressInfo);
}

function selectAddresses(data) {
  if (data.addresses.length > 0) {
    currentAddresses = data.addresses;
    addressInfo = data.info;

    html = '<select id="address_select"><option>Please choose...</option>';
    $.each(data.addresses, function(i, address) {
      html += '<option value="' + i + '">' + address.formattedAddress + '</option>'; 
    });
    html = html + '</select>';
    $('#totalcheck_address_list').html(html);

    //$("#address_select").css('width', $("#companyname").css('width'));

    $('#address_select').change(function() {
      applyAddress(currentAddresses[$('#address_select option:selected').val()], addressInfo);
    });

    $('#totalcheck_select').show();
  } else {
    $('#totalcheck_select').hide();
    applyAddress(data.address, data.info);
  }
}

function applyAddress(address, info) {
  manualChange = false;

  if (info.whitePages == 'true' && info.postal == 'true') {
    source = 'WP+PAF ';
  } else if (info.whitePages == 'true') {
    source = 'WP ';
  } else if (info.postal == 'true') {
    source = 'PAF ';
  } else {
    source = '';
  }
  
  nlapiSetCurrentLineItemValue('addressbook', 'phone', address.phoneNumber.replace(/[^0-9]/g, ''));

  addr = address.streetNumber + ' ' + address.streetName + ' ' + address.streetType;
  if (address.subPremise == '') {
    nlapiSetCurrentLineItemValue('addressbook', 'addr1', addr);
    nlapiSetCurrentLineItemValue('addressbook', 'addr2', '');
  } else {
    nlapiSetCurrentLineItemValue('addressbook', 'addr1', address.subPremise);
    nlapiSetCurrentLineItemValue('addressbook', 'addr2', addr);
  }
  nlapiSetCurrentLineItemValue('addressbook', 'addr3', '');

  nlapiSetCurrentLineItemValue('addressbook', 'city', address.suburb);
  nlapiSetCurrentLineItemValue('addressbook', 'zip', address.postcode);
  nlapiSetCurrentLineItemValue('addressbook', 'country', 'AU');
  nlapiSetCurrentLineItemValue('addressbook', 'state', address.state);
  
  nlapiSetCurrentLineItemValue('addressbook', 'label', source + 'BSP:' + info.bsp + ' DPID:' + address.dpid);
}
