gsheet_canvas_api
=================

This is a script to let you populate Google Spreadsheets with Canvas API data. I'm 
planning to publish it to Google's script gallery, but you can also just install it
in your own spreadsheet. Directions below.

## SETUP

In order for this script to work you'll first need to know the API host you want to 
speak to (typically https://yourschool.instructure.com) and you'll also need to 
generate an access token for the script to make calls on your behalf.

Once you have the values you need to add this script to your Google Spreadsheet as a 
script. In the Spreadsheet click Tools -> Script Editor. Then paste this source 
code in to the editor that pops up. You'll also need to add Underscore as a dependency. 
In the script editor click Resources -> Manage Libraries. In the Find a Library box 
enter "MGwgKN2Th03tJ5OdmlzB8KPxhMjh3Sh48". This script was written using version 23, 
but you can probably just pick the latest version and you'll be safe.

Next, still in the script editor, click File -> Project Properties. Go to the Project 
Properties tab and add two rows:

- `canvas_api_host`: (typically https://yourschool.instructure.com)
- `canvas_access_token`: (generate a new token from your profile page in Canvas)

## USAGE

Now you're set up. You can use the helper methods below to make commong API requests:

- `=canvasCourseList()`
- `=canvasCourseList(221)`
- `=canvasPageViews("12345")`

Or use the generic methods to call any method not listed:

- `=canvasList("/api/v1/users/9876/logins")`
- `=canvasObject("/api/v1/courses/1234")`

You can also specify additional options using the second parameter. These options can 
be passed as a string similar to query strings used in URLs. Possible options are:
 
- `results`: for list API calls you can specify how many results you want back and it willquery 
  multiple pages until it gets to that number of results. Note that more results take more time, 
  and DON'T MAKE LARGE RESULT REQUESTS VERY OFTEN OR 
  PANDA WILL BE SAD.
- `keys`: a comma-separated list of keys. If none are provided it will return all keys from 
  the API. If keys are provided, the columns will appear in the order specified 
  in the list.

Here's some example strings for your benefit:

- "results=30&keys=url,action,user_agent,user_id,render_time"
- "results=100"
- "keys=name,login,id"

And some examples of using options in helper methods:
- `=canvasCourseList(221, "results=100")`
- `=canvasPageViews("12345", "results=30&keys=url,action,user_agent,user_id,render_time")`

There are some helper methods around getting out account-level reports, which get
get generated as csv files for downloa
- `=canvasAccountReports("self")`
- `=canvasAccountReport("self", "grade_csv")`
