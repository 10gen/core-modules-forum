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

core.ext.getdefault();
// *extremely* simplistic paging functionality
// FIXME: Someone needs to think really hard about how this ought to work!

// Seems like this will need to hook into the routes system in order to be
// really "nice".

// Here are links to how other web frameworks do it:

// http://pylonshq.com/WebHelpers/class-webhelpers.pagination.Paginator.html
// http://www.nullislove.com/2007/05/24/pagination-in-rails/
// http://www.igvita.com/2006/09/10/faster-pagination-in-rails/
// http://www.djangoproject.com/documentation/models/pagination/
// http://www.djangoproject.com/documentation/generic_views/
// http://docs.turbogears.org/1.0/PaginateDecorator
// http://www.tonymarston.net/php-mysql/pagination.html

// Also seems like we'd need to provide some useful "default" pagination
// renderers.. one with a window, one without? previous, next links?

// Where should page numbers be zero-based, when one-based?

/**
* @param ary                     the array to be paginated.
* @param config.pageSize         how many results on each page (defaults to request.pageSize or 20)
* @param config.page             which page to display (defaults to request.page or 1)
* @param config.displayOpts      what options to use in displaying the pager (see paging.jxp)
* @param config.padding          how many page links in either direction to show when rendering the pager (defaults to 2)
* @param config.nextlinkInterval how many pages the "next" link should advance (defaults to twice padding plus 1)
* @param config.minWindow        how many page links should be shown at a minimum (defaults to 5)
                                 If this is smaller than 2*padding+1, weird things might happen!
*/

Forum.data.Paging = function(ary, config, request){
    // one-based
    config = config || {};
    request = request || {};
    this.ary = ary;
    this.pageSize = config.pageSize || request.pageSize || 20;
    this.minWindow = Ext.getdefault(config, 'minWindow',
                                    request.minWindow || 5);
    this._numPages = Math.ceil(ary.length / this.pageSize);

    this.page = config.page || request.page || 1;
    this.page = parseInt(this.page);
    if(this.page == -1) this.page = this._numPages;
    this.padding = Ext.getdefault(config, 'padding', 2);
    this.nextlinkInterval = Ext.getdefault(config, 'nextlinkInterval', 2*this.padding+1);

    this.displayOpts = Ext.getdefault(config, 'displayOpts', {});
};

Forum.data.Paging.prototype.numPages = function(){
    return this._numPages;
};

Forum.data.Paging.prototype.pageNumber = function(){
    // 1-based?
    return this.page;
};

Forum.data.Paging.prototype.slice = function(){
    ary = [];
    // zero-based
    var pagez = this.page - 1;
    for(var i = 0; i < this.pageSize; i++){
        if(i+pagez*this.pageSize >= this.ary.length) break;
        ary[i] = this.ary[i+pagez*this.pageSize];
    }
    return ary;
};

Forum.data.Paging.prototype.getWindow = function(){
    return new Forum.data.Paging.Window(this, this.page, this.padding);
};

// A Window is just a range of pages.
// In this class, everything is one-based?

/**
* @param page is the page number you're currently on.
* @param padding is the amount to extend the window in either direction.
*/
Forum.data.Paging.Window = function(pager, page, padding){
    padding = padding || 0;
    this.first = page-padding;
    if(this.first < 1) this.first = 1;
    this.last = page+padding;
    if(this.last > pager.numPages()) this.last = pager.numPages();
    var range = this.last - this.first + 1;
    if((this.first > 1 || this.last < pager.numPages()) &&
       (range < pager.minWindow)){
        if(pager.numPages() < pager.minWindow){
            this.first = 1;
            this.last = pager.numPages();
        }
        else {
            if(this.first == 1){
                this.last = pager.minWindow;
            }
            else if(this.last == pager.numPages()){
                this.first = pager.numPages() - pager.minWindow + 1;
            }
            else {
                // FIXME: distribute the slack on both sides until something
                // bad happens?
            }
        }
    }
};

Forum.data.Paging.Window.prototype.getFirstPage = function(){
    return this.first;
};

Forum.data.Paging.Window.prototype.getLastPage = function(){
    return this.last;
};
