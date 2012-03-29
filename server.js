var express = require('express'), 
    fs = require('fs'), 
    app = module.exports = express.createServer(),
    md = require('markdown'),
    prettify = require('./prettify'),
    zip = require("node-native-zip");
//app config
app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.bodyParser());
    app.use(express.static(__dirname + '/public'));
    app.set('view options', {
        layout: false
    });
});
function getSid(){
    var now = new Date();
    return now.getTime();
}
function createWebSlide(res, sid){
    var webSlide = '{"pages": ["%23Hello%20WebSlide%23%0A%5Bmarkdown%5D(http%3A%2F%2Fzh.wikipedia.org%2Fwiki%2FMarkdown)%E8%AF%AD%E6%B3%95%E5%BC%BA%E5%8A%9B%E9%A9%B1%E5%8A%A8"]}';
    fs.writeFile('data/' + sid + '.json', webSlide, 'utf8', function(err){
        if (err) {
            throw err;
        }
        else {
            res.render('index', {'sid': sid, 'max': 1});
        }
    });
}
function enhtmlspecialchars(str){
    if (typeof(str) == "string") {
        str = str.replace(/&quot;/g, "\"");
        //str = str.replace(/&#039;/g, "'");
        str = str.replace(/&lt;/g, "<");
        str = str.replace(/&gt;/g, ">");
        str = str.replace(/&brvbar;/g, '|');
        str = str.replace(/&amp;/g, "&"); /* must do &amp; last */
    }
    return str;
}

function highlight(code) {
    code = md.markdown.toHTML(enhtmlspecialchars(decodeURIComponent(code)));
    code = code.replace(/<pre><code>([\w\W]*?)<\/code><\/pre>/g, function(str, p1) {
        p1 = p1.replace(/&#39;/g, "'");
        p1 = prettify.prettyPrintOne(p1);
        return '<pre><code>' + p1 + '</code></pre>';
    });
    return code;
}

function combo(sid, callback) {
    var header = '<!DOCTYPE HTML><html><head><meta charset="UTF-8"><title>WebSlide</title><link rel="stylesheet" href="../css/webslide.css" /></head><body><div id="slide" ><div class="slides">', footer = '</div><div class="progress"><span></span></div></div><canvas id="myCanvas" width="1024" height="768">您的浏览器不支持HTML5,请升级或更换您的浏览器,强烈推荐您使用chrome浏览器。</canvas><menu class="controls" id="slideCtrl"><span class="tool home" onclick="location.hash=\'#cover\'">!</span><span class="tool paint">p</span><span class="tool clearIt">d</span></menu><script type="text/javascript" src="../js/webslide.js"></script></body></html>', webslide, page = '', len;
    fs.readFile('data/' + sid + '.json', 'utf8', function(err, data) {
        if(err) {
            callback('0');
            throw err;
        } else {
            webslide = JSON.parse(data);
            len = webslide.pages.length;
            for(var i = 0; i < len; i++) {
                page += i? '<section id="cover' + i + '" class="step slide" >' : '<section id="cover" class="step slide" >';
                page += highlight(webslide.pages[i]);
                page += '</section>';
            }
            page = header + page + footer;

            fs.writeFile('public/html/' + sid + '.html', page, 'utf8', function(err) {
                if(err) {
                    callback('0');
                    throw err;
                } else {
                    callback('1');
                }
            });
        }
    });
}

app.get('/:sid', function(req, res){
    var sid = req.params.sid;
    if (+sid) {
        fs.readFile('data/' + sid + '.json', 'utf8', function(err, data){
            if (err) {
                createWebSlide(res, sid);
                throw err;
            }
            else {
                res.render('index', {'sid': sid, 'max': JSON.parse(data).pages.length});
            }
        });
    }
});
app.get('/page/:sid', function(req, res){
    var sid = req.params.sid;
    if (+sid) {
        combo(sid, function(result){
            res.write(result);
            res.end();
        });
    }else{
        res.write('0');
        res.end();
    }
});



app.get('/zip/:sid', function(req, res) {
    var sid = req.params.sid;
    if(+sid) {
        combo(sid, function(result) {
            if(result) {
                var archive = new zip();
                archive.addFiles([{
                    name : 'css/webslide.css',
                    path : 'public/css/webslide.css'
                }, {
                    name : 'js/webslide.js',
                    path : 'public/js/webslide.js'
                }, {
                    name : 'font/iconic_stroke-webfont.ttf',
                    path : 'public/font/iconic_stroke-webfont.ttf'
                }, {
                    name : 'font/iconic_stroke-webfont.eot',
                    path : 'public/font/iconic_stroke-webfont.eot'
                }, {
                    name : 'html/webslide.html',
                    path : 'public/html/' + sid + '.html'
                }], function(err) {
                    if(err) {
                        res.write('0');
                        throw err;
                    } else {
                        var buff = archive.toBuffer();
                        fs.writeFile('public/zip/' + sid + '.zip', buff, function() {
                            console.log(sid + '.zip Finished');
                            res.write('1');
                        });
                    }
                    res.end();
                });
            } else {
                res.write('0');
                res.end();
            }

        });
    } else {
        res.write('0');
        res.end();
    }
});

app.get('/*', function(req, res){
    var sid = getSid();
    res.redirect('/' + sid);
});
app.post('/showpage/*', function(req, res){
    var sid = req.body.sid, id = req.body.id;
    fs.readFile('data/' + sid + '.json', 'utf8', function(err, data){
        if (err) {
            res.write('非法请求!');
            res.end();
            throw err;
        }
        else {
            if(id > JSON.parse(data).pages.length){
                res.write('非法请求!');
            }else{
                res.write(enhtmlspecialchars(decodeURIComponent(JSON.parse(data).pages[id-1])));
            }            
            res.end();
        }
    });
});
app.post('/savepage/*', function(req, res){
    var sid = req.body.sid, id = req.body.id, code = req.body.code;
    fs.readFile('data/' + sid + '.json', 'utf8', function(err, data){
        if (err) {                      
            res.write('0');
            res.end();
            throw err;
        }
        else {
            var webSlide = JSON.parse(data),ws;
            id = id > webSlide.pages.length + 1 ? webSlide.pages.length + 1 : id;   
            webSlide.pages[id-1] = code;
            ws = JSON.stringify(webSlide);
            fs.writeFile('data/' + sid + '.json', ws, 'utf8', function(err){
                if (err) {
                    res.write('0');
                    res.end();
                    throw err;
                }else{
                    res.write('1');
                    res.end();
                }                
            });
        }
    });
});
app.post('/delpage/*', function(req, res){
    var sid = req.body.sid, id = req.body.id;
    fs.readFile('data/' + sid + '.json', 'utf8', function(err, data){
        if (err) {                      
            res.write('0');
            res.end();
            throw err;
        }
        else {
            var webSlide = JSON.parse(data),ws;
            id = id > webSlide.pages.length ? webSlide.pages.length : id;   
            webSlide.pages.splice(id-1, 1);
            ws = JSON.stringify(webSlide);
            fs.writeFile('data/' + sid + '.json', ws, 'utf8', function(err){
                if (err) {
                    res.write('0');
                    res.end();
                    throw err;
                }else{
                    res.write('1');
                    res.end();
                }                
            });
        }
    });
});
app.listen(80);