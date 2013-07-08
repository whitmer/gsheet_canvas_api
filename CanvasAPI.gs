// This is a script to let you populate Google Spreadsheets with Canvas API data
//
// ==== SETUP ====
// In order for this script to work you'll first need to know the API host you want to 
//   speak to (typically https://yourschool.instructure.com) and you'll also need to 
//   generate an access token for the script to make calls on your behalf.
//
// Once you have the values you need to add this script to your Google Spreadsheet as a 
//   script. In the Spreadsheet click Tools -> Script Editor. Then paste this source 
//   code in to the editor that pops up. You'll also need to add Underscore as a dependency. 
//   In the script editor click Resources -> Manage Libraries. In the Find a Library box 
//   enter "MGwgKN2Th03tJ5OdmlzB8KPxhMjh3Sh48". This script was written using version 23, 
//   but you can probably just pick the latest version and you'll be safe.
//
// Next, still in the script editor, click File -> Project Properties. Go to the Project 
//   Properties tab and add two rows:
//
//   canvas_api_host: (typically https://yourschool.instructure.com)
//   canvas_access_token: (generate a new token from your profile page in Canvas)
//
// ==== USAGE ====
// Now you're set up. You can use the helper methods below to make commong API requests:
//
//   =canvasCourseList()
//   =canvasCourseList(221)
//   =canvasPageViews("12345")
//
// Or use the generic methods to call any method not listed:
//
//   =canvasList("/api/v1/users/9876/logins")
//   =canvasObject("/api/v1/courses/1234")
//
// You can also specify additional options using the second parameter. These options can 
//   be passed as a string similar to query strings used in URLs. Possible options are:
//
//   results: for list API calls you can specify how many results you want back and it will 
//            query multiple pages until it gets to that number of results. Note that more 
//            results take more time, and DON'T MAKE LARGE RESULT REQUESTS VERY OFTEN OR 
//            PANDA WILL BE SAD.
//   keys: a comma-separated list of keys. If none are provided it will return all keys from 
//            the API. If keys are provided, the columns will appear in the order specified 
//            in the list.
//
// Here's some example strings for your benefit:
//
//   "results=30&keys=url,action,user_agent,user_id,render_time"
//   "results=100"
//   "keys=name,login,id"
//
// And some examples of using options in helper methods:
//   =canvasCourseList(221, "results=100")
//   =canvasPageViews("12345", "results=30&keys=url,action,user_agent,user_id,render_time")
//

// Now on to the code

// Helper methods for common requests

/**
* Lists all courses for the current user or specified account
*
* @param account_id the id of the account to query. If blank or set to mine will instead get list of courses for the current user
* @param options string of additional options for filtering columns, number of results, etc.
* @return a list of courses
*/
function canvasCourseList(account_id, options){  
  if(account_id == 'mine' || !account_id) {
    return canvasList("/api/v1/courses", options);
  } else {
    return canvasList("/api/v1/accounts/" + account_id + "/courses", options);
  }
};

/**
* Lists all page views for the current or specified user
*
* @param user_id the id of the user to lookup for queries
* @param options string of additional options for filtering columns, number of results, etc.
* @return a list of page views
*/
function canvasPageViews(user_id, options) {
  if(user_id == 'me' || !user_id) {
    return canvasList("/api/v1/users/self/page_views", options)
  } else {
    return canvasList("/api/v1/users/" + user_id + "/page_views", options)
  }
}

/**
* Lists all accounts for the current user
*
* @param options string of additional options for filtering columns, number of results, etc.
* @return a list of accounts
*/
function canvasAccountsList(options){
  return canvasList("/api/v1/accounts", options);
};



function testCanvasList() {
  canvasList("/api/v1/users/self/page_views", "results=30&keys=url,action,user_agent,user_id,render_time");
}

var _ = Underscore.load();

// Generic list API endpoint
/**
* Get a list of objects from a list-based endpoint in the Canvas API
*
* @param endpoint API endpoint to hit (i.e. "/api/v1/users/self/page_views")
* @param options string of additional options for filtering columns, number of results, etc.
* @return a list of results
*/
function canvasList(endpoint, options){
  var options = parseOptions_(options, {results: 20, keys: ""});
  var result = canvasGET(endpoint, options);
  var list = result.result;
  if(options && options.results) {
    while(result.hasMore && list.length < options.results) {
      result = canvasGET(result.endpoint, options);
      list = list.concat(result.result);
    }
  }
  return listify_(list, options.keys);
}

// Generic object API endpoint
/**
* Lists all attributes for the object-based endpoint in the Canvas API
*
* @param options string of additional options for filtering columns, number of results, etc.
* @return a list of results
*/
function canvasObject(endpoint, options) {
  return listify_(canvasGET(endpoint, options).result);
}

// Generic GET request API endpoint
// adapted from http://mashe.hawksey.info/2013/02/lak13-recipes-in-capturing-and-analyzing-data-using-sna-on-canvas-discussions-with-nodexl-for-when-its-not-a-snapp/
function canvasGET(endpoint, options){
  var token = UserProperties.getProperty("canvas_access_token") || ScriptProperties.getProperty("canvas_access_token");
  if(!token) { return "missing property: canvas_access_token must be set in File -> Project Properties" }
  var host = UserProperties.getProperty("canvas_api_host") || ScriptProperties.getProperty("canvas_api_host");
  if(!host) { return "missing property: canvas_api_host must be set in File -> Project Properties" }
  var options = parseOptions_(options)
  var perpage = (options.per_page != undefined) ? "?per_page="+options.per_page : "";
  var resp = {};
  var requestData = { method: "get",
                      headers: { "Authorization": "Bearer " + token}};
  var result = UrlFetchApp.fetch(host + endpoint + perpage, requestData);
  if (result.getResponseCode() == 200){
    var header = result.getHeaders();
    if (header.Link) {
      var nextLink = parseLinkHeader_(header.Link).rels.next.href;
      if (nextLink) {
        nextLink = "/" + nextLink.split(/\//).slice(3).join("/");
        resp.endpoint = nextLink;
        resp.hasMore = true;
      }
    }
    resp.result = JSON.parse(result.getContentText());
    resp.responseCode = 200;
  } else {
    resp.responseCode = result.getResponseCode();
    resp.message = result.getContentText();
  }
  return resp;
}
  
// Parses the query string-style parameters that can be passed for API calls
function parseOptions_(str, defaults){
  var options = defaults || {};
  if(typeof(str) == 'string') {
    var splits = (str || "").split(/&/);
    for(var idx in splits) {
      var vals = splits[idx].split(/=/);
      if(vals.length == 2) {
        options[vals[0]] = vals[1];
      }
    }
  }
  return options;
}

// Make the list a spreadsheet list, including support for filtering to only certain columns
function listify_(obj, onlyKeys) {
  var tempKeys = (onlyKeys || "").split(/,/);
  var shownKeys = []
  for(var idx in tempKeys) {
    if(tempKeys[idx]) {
      shownKeys.push(tempKeys[idx]);
    }
  }
  if(obj instanceof Array) {
    var objects = _.map(obj, function(item) { return traverse_(item) });
    var keyCounts = {};
    _.each(objects, function(item) {
      _.each(_.keys(item), function(key) { keyCounts[key] = (keyCounts[key] || 0) + 1; });
    });
    var list = [[]];
    // Only show keys that are consistent across all result entities
    for(var idx in keyCounts) {
      if(keyCounts[idx] == obj.length) {
        list[0].push(idx);
      }
    }
    // Limit to only set keys if specified
    if(shownKeys.length > 0) {
      list[0] = _.intersection(shownKeys, list[0]);
    }
    for(var idx in obj) {
      var itemResult = [];
      var item = obj[idx];
      for(var idx in list[0]) {
        var key = list[0][idx];
        itemResult.push(item[key]);
      }
      list.push(itemResult);
    }
    return list;
  } else {
    return listify_([obj]);
  }
}

// http://bill.burkecentral.com/2009/10/15/parsing-link-headers-with-javascript-and-java/
function parseLinkHeader_(value) {
  var linkexp=/<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g;
  var paramexp=/[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g;
  var matches = value.match(linkexp);
  var rels = new Object();
  var titles = new Object();
  for (i = 0; i < matches.length; i++)
  {
    var split = matches[i].split('>');
    var href = split[0].substring(1);
    var ps = split[1];
    var link = new Object();
    link.href = href;
    var s = ps.match(paramexp);
    for (j = 0; j < s.length; j++) {
      var p = s[j];
      var paramsplit = p.split('=');
      var name = paramsplit[0];
      link[name] = unquote_(paramsplit[1]);
    }
    if (link.rel != undefined) {
      rels[link.rel] = link;
    }
    if (link.title != undefined)  {
      titles[link.title] = link;
    }
  }
  var linkheader = new Object();
  linkheader.rels = rels;
  linkheader.titles = titles;
  return linkheader;
}

function unquote_(value) {
  if (value.charAt(0) == '"' && value.charAt(value.length - 1) == '"') return value.substring(1, value.length - 1);
  return value;
}

/* From Devlin Daley
Recursively descend into each of the objects properties
flattening the whole hierarchical object model.

Hierarchy is moved into the name of the keys, separated by "|" character.

Example:
obj = 
{
name: "Devlin",
bday : {
   month:"may",
   day:"27"
   }
}
traverse_(obj) =>
{
name: "Devlin",
bday|month: "may",
bday|day: "27"
}

*/
function traverse_(o){
  var flat = {};
  _(o).each(function(val,key){
    if (_.isObject(val)) {
      var sub_tree = traverse_(val);

      _(sub_tree).each(function(sval,skey){
        flat[key + "|" + skey] = sval; })

    } else {
      flat[key] = val;
    }
  });
  return flat;
};
