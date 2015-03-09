/*
  TotalCheck Proxy

  Copyright 2011 Brendel IT Services

  Author: Vincent Brendel
  Version: 1.0
  Released: 23 Oct 2011
    
  Set these parameters:
  * custscript_totalcheck_url: https://stage.totalcheck.sensis.com.au or https://totalcheck.sensis.com.au
  * custscript_totalcheck_username: your TotalCheck login
  * custscript_totalcheck_password: your TotalCheck password
  
*/

function totalcheckProxy(request, response)
{
  var json = null;
  if (!request.getParameter('type')) {
    type = 'Both';
  } else {
    type = request.getParameter('type');
  }
  
  if (request.getParameter('call') == 'name') {
    term = request.getParameter('term');
    json = suggestNamesJSON(term, type);
  } else if (request.getParameter('call') == 'suggest') {
    term = request.getParameter('term');
    name = request.getParameter('name');
    json = suggestAddressesJSON(name, type, term);
  } else if (request.getParameter('call') == 'select') {
    name = request.getParameter('name');
    suggestion = request.getParameter('suggestion');
    json = selectAddressesJSON(name, type, suggestion);
  }
  
  var callback = request.getParameter('callback');
  if (callback != null) {
    response.write(callback + '(' + json + ')');
  } else {
    response.write(json);
  }
}


function suggestNamesJSON(name, type)
{
  response = TCRequest(
    'suggestNames',
    '<ser:suggestNames><searchType>' + type + '</searchType><name>' + name.replace(/&/, '') + '</name></ser:suggestNames>'
  );
  json = '';
  var i = response.indexOf('<return>');
  json += '[';
  while (i > 0)
  {
    i += '<return>'.length;
    suggestion = response.substring(i, response.indexOf('</return>', i));
    json += '"' + suggestion.replace(/&amp;/, '&') + '"';
    i = response.indexOf('<return>', i);
    if (i > 0)
    	json += ", ";
  }
  json += ']';
  return json;
}


function suggestAddressesJSON(name, type, address)
{
  response = TCRequest(
    'suggestAddresses',
    '<ser:suggestAddresses><search><formattedAddress>'+address+'</formattedAddress><formattedAddressIncludesPostcode>false</formattedAddressIncludesPostcode><formattedAddressIncludesState>true</formattedAddressIncludesState><formattedAddressIncludesSuburb>true</formattedAddressIncludesSuburb><name>'+name+'</name><searchType>Both</searchType></search></ser:suggestAddresses>'
  );

  json = '';
  i = response.indexOf('<resultList>');
  json += '[';
  while (i > 0)
  {
    i += '<resultList>'.length;
    suggestion = response.substring(i, response.indexOf('</resultList>', i));
    
    j = suggestion.indexOf('<formattedAddress>');
    address = suggestion.substring(j + '<formattedAddress>'.length, suggestion.indexOf('</formattedAddress>', j));
    address = address.replace(/&amp;/g, "&");
    json += '{"label":"' + address + '","value":"' + address + '","suggestion":"' + suggestion.replace(/&amp;/g, ";ampersand;") + '"}';
    
    i = response.indexOf('<resultList>', i);
    if (i > 0)
    	json += ", ";
  }
  json += ']';
  return json;
}


function selectAddressesJSON(name, type, suggestion)
{
  nlapiLogExecution('AUDIT', 'TotalCheck address select', 'Suggestion: ' + nlapiEscapeXML(suggestion));

  suggestion = suggestion.replace(/;ampersand;/g, "&amp;");
  response = TCRequest(
    'selectAddress',
    '<ser:selectAddress><suggestion>'+suggestion+'</suggestion></ser:selectAddress>'
  );

  count = 0;

  json = '';
  i = response.indexOf('<detailList>');
  json += '{addresses: [';
  while (i > 0)
  {
    count++;
    
    i += '<detailList>'.length;
    detail = response.substring(i, response.indexOf('</detailList>', i));
    
    json += '{';
    a = ["formattedAddress", "subPremise", "streetNumber", "streetName", "streetType", "suburb", "postcode", "state", "phoneNumber", "dpid"];
    for (field in a) {
      j = detail.indexOf('<'+a[field]+'>');
      if (j > 0) {
        j += a[field].length + 2;
        val = detail.substring(j, detail.indexOf('</'+a[field]+'>', j));
      } else {
        val = '';
      }
      json += a[field]+': "'+val+'"';
      if (a[field] != "dpid") json += ", ";
    }
    json += '}';

    i = response.indexOf('<detailList>', i);
    if (i > 0)
    	json += ", ";
	}
	json += ']';
  
  if (count == 0) {

    json += ', address: {';
    a = ["formattedAddress", "subPremise", "streetNumber", "streetName", "streetType", "suburb", "postcode", "state", "phoneNumber", "dpid"];
    for (field in a) {
      j = response.indexOf('<'+a[field]+'>');
      if (j > 0) {
        j += a[field].length + 2;
        val = response.substring(j, response.indexOf('</'+a[field]+'>', j));
      } else {
        val = '';
      }
      json += a[field]+': "'+val+'"';
      if (a[field] != "dpid") json += ", ";
    }
    json += '}';
    
  }

  json += ', info: {';
  a = ["whitePages", "postal", "inPrintedWpBook", "barcode", "bsp"];
  for (field in a) {
    j = response.indexOf('<'+a[field]+'>');
    if (j > 0) {
      j += a[field].length + 2;
      val = response.substring(j, response.indexOf('</'+a[field]+'>', j));
    } else {
      val = '';
    }
    json += a[field]+': "'+val+'"';
    if (a[field] != "bsp") json += ", ";
  }
  json += '}';
    
  json += '}';
	
  return json;
}


function TCRequest(method, tc_request)
{
  var tcUrl = nlapiGetContext().getSetting('SCRIPT', 'custscript_totalcheck_url');
  var tcUser = nlapiGetContext().getSetting('SCRIPT', 'custscript_totalcheck_username');
  var tcPassword = nlapiGetContext().getSetting('SCRIPT', 'custscript_totalcheck_password');
  
  request = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:ser="' + tcUrl + '/service">';
  request += '<soapenv:Header>';
  request += '<wsse:Security><wsse:UsernameToken><wsse:Username>' + tcUser + '</wsse:Username><wsse:Password>' + tcPassword + '</wsse:Password></wsse:UsernameToken></wsse:Security>';
  request += '</soapenv:Header><soapenv:Body>'+tc_request+'</soapenv:Body></soapenv:Envelope>';

  nlapiLogExecution('AUDIT', 'TotalCheck request', 'Callout to: ' + tcUrl + '/service/webservice/' + method);
  nlapiLogExecution('DEBUG', 'TotalCheck request', 'SOAP request: ' + nlapiEscapeXML(request));

  response = SOAPRequest(tcUrl + '/service/webservice/' + method, request);

  nlapiLogExecution('DEBUG', 'TotalCheck request', 'SOAP response: ' + nlapiEscapeXML(response));
  
  return response;
}


function SOAPRequest(url, request) {
  var headers = new Array();
  response = nlapiRequestURL(url, request, headers);
  return response.getBody();
}
