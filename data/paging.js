// *extremely* simplistic paging functionality
// FIXME: Someone needs to think really hard about how this ought to work!

// Seems like this will need to hook into the routes system in order to be
// really "nice".

// Here are how links to other web frameworks:

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

app.Forum.data.Paging = function(ary, config, request){
    config = config || {};
    request = request || {};
    this.ary = ary;
    this.pageSize = config.pageSize || request.pageSize || 20;
    this._numPages = Math.ceil(ary.length / this.pageSize);

    this.page = config.page || request.page || 1;
};

app.Forum.data.Paging.prototype.numPages = function(){
    return this._numPages;
};

app.Forum.data.Paging.prototype.pageNumber = function(){
    // 1-based?
    return this.page;
};

app.Forum.data.Paging.prototype.slice = function(){
    ary = [];
    // zero-based
    var pagez = this.page - 1;
    for(var i = 0; i < this.pageSize; i++){
        if(i+pagez*this.pageSize >= this.ary.length) break;
        ary[i] = this.ary[i+pagez*this.pageSize];
    }
    return ary;
};

app.Forum.data.Paging.prototype.display = function(url, paramName, cssClass){
    url = url || new URL(request.getURL());
    paramName = paramName || "page";
    cssClass = cssClass || "";
    return app.Forum.data.Paging.display(this._numPages, this.page, url, paramName, cssClass);
};

/**
* @link /foo?
* @param paramName = "page"
*
* @return /foo?page=5
*/
app.Forum.data.Paging.display = function( numPages , curPage , url , paramName , cssClass ){
    var s = "";
    for(var i = 1; i <= numPages; i++){
        if(i != curPage){
            s += "<a class=\""+cssClass+"\" href=\""+url.replaceArg(paramName, i).toString()+"\">"+(i)+"</a> ";
        } else {
            s += (i) + " ";
        }
    }
    return s;
};
