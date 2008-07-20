/**
*      Copyright (C) 2008 10gen Inc.
*  
*    Licensed under the Apache License, Version 2.0 (the "License");
*    you may not use this file except in compliance with the License.
*    You may obtain a copy of the License at
*  
*       http://www.apache.org/licenses/LICENSE-2.0
*  
*    Unless required by applicable law or agreed to in writing, software
*    distributed under the License is distributed on an "AS IS" BASIS,
*    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*    See the License for the specific language governing permissions and
*    limitations under the License.
*/

Forum.root.data.paging();

var Paging = Forum.data.Paging;

var data = [1, 2, 3, 4, 5];

var p = new Paging(data, {pageSize: 2, page: 3});

assert(p.numPages() == 3);
slice = p.slice();
assert(slice[0] == 5);
assert(slice.length == 1);


var p = new Paging(data, {pageSize: 2, page: 3});
var w = p.getWindow();
assert(w.getFirstPage() == 1);
assert(w.getLastPage() == 3);

var p = new Paging(data, {pageSize: 2, page: 3, padding: 0, minWindow: 0});
var w = p.getWindow();
assert(w.getFirstPage() == 3);
assert(w.getLastPage() == 3);

var data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
var p = new Paging(data, {pageSize: 2, page: 1, padding: 0, minWindow: 0});
var w = p.getWindow();
assert(w.getFirstPage() == 1);
assert(w.getLastPage() == 1);

var p = new Paging(data, {pageSize: 2, page: 1, padding: 2, minWindow: 5});
var w = p.getWindow();
assert(w.getFirstPage() == 1);
assert(w.getLastPage() == 5);

var p = new Paging(data, {pageSize: 2, page: 4, padding: 2, minWindow: 5});
var w = p.getWindow();
assert(w.getFirstPage() == 2);
assert(w.getLastPage() == 6);
