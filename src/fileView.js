import marked from 'marked'

import { renderHTML } from './render/htmlWrapper'
import { renderPath } from './render/pathUtil'
import { renderMarkdown } from './render/mdRenderer'

import { preview, extensions } from './render/fileExtension'

/**
 * Render code blocks with the help of marked and Markdown grammar
 *
 * @param {Object} file Object representing the code file to preview
 * @param {string} lang The markdown code language string, usually just the file extension
 */
async function renderCodePreview(file, lang) {
  const resp = await fetch(file['@microsoft.graph.downloadUrl'])
  const content = await resp.text()
  const toMarkdown = `\`\`\`${lang}\n${content}\n\`\`\``
  const renderedCode = marked(toMarkdown)
  return `<div class="markdown-body" style="margin-top: 0;">
            ${renderedCode}
          </div>`
}

/**
 * Render PDF with built-in PDF viewer
 *
 * @param {Object} file Object representing the PDF to preview
 */
function renderPDFPreview(file) {
  return `<div id="pdf-preview-wrapper"></div>
          <div class="loading-label">
            <i class="fas fa-spinner fa-pulse"></i>
            <span id="loading-progress">Loading PDF...</span>
          </div>
          <script>
          // No variable declaration. Described in https://github.com/spencerwooo/onedrive-cf-index/pull/46
          loadingLabel = document.querySelector('.loading-label')
          loadingProgress = document.querySelector('#loading-progress')
          function progress({ loaded, total }) {
            loadingProgress.innerHTML = 'Loading PDF... ' + Math.round(loaded / total * 100) + '%'
          }

          fetch('${file['@microsoft.graph.downloadUrl']}').then(response => {
            if (!response.ok) {
              loadingLabel.innerHTML = '😟 ' + response.status + ' ' + response.statusText
              throw Error(response.status + ' ' + response.statusText)
            }
            if (!response.body) {
              loadingLabel.innerHTML = '😟 ReadableStream not yet supported in this browser. Please download the PDF directly using the button below.'
              throw Error('ReadableStream not yet supported in this browser.')
            }

            const contentEncoding = response.headers.get('content-encoding')
            const contentLength = response.headers.get(contentEncoding ? 'x-file-size' : 'content-length')
            if (contentLength === null) {
              loadingProgress.innerHTML = 'Loading progress unavailable. Please wait or download the PDF directly using the button below.'
              console.error('Response size header unavailable')
              return response
            }

            const total = parseInt(contentLength, 10)
            let loaded = 0

            return new Response(
              new ReadableStream({
                start(controller) {
                  const reader = response.body.getReader()

                  read()
                  function read() {
                    reader.read().then(({ done, value }) => {
                      if (done) {
                        controller.close()
                        return
                      }
                      loaded += value.byteLength
                      progress({ loaded, total })
                      controller.enqueue(value)
                      read()
                    }).catch(error => {
                      console.error(error)
                      controller.error(error)
                    })
                  }
                }
              })
            )
          })
            .then(resp => resp.blob())
            .then(blob => {
              const pdfFile = new Blob([blob], { type: 'application/pdf' })
              const pdfFileUrl = URL.createObjectURL(pdfFile)
              loadingLabel.classList.add('fade-out-bck')

              setTimeout(() => {
                loadingLabel.remove()
                document.querySelector('#pdf-preview-wrapper').classList.add('fade-in-fwd')
                PDFObject.embed(pdfFileUrl, '#pdf-preview-wrapper', {
                  height: '80vh',
                  fallbackLink: '<p>😟 This browser does not support previewing PDF, please download the PDF directly using the button below.</p>'
                })
              }, 600)
            })
          </script>`
}

/**
 * Render image (jpg, png or gif)
 *
 * @param {Object} file Object representing the image to preview
 */
function renderImage(file) {
  return `<div class="image-wrapper">
            <img data-zoomable src="${file['@microsoft.graph.downloadUrl']}" alt="${file.name}" style="width: 100%; height: auto; position: relative;"></img>
          </div>`
}

/**
 * Render video (mp4, flv, m3u8, webm ...)
 *
 * @param {Object} file Object representing the video to preview
 * @param {string} fileExt The file extension parsed
 */
function renderVideoPlayer(file, fileExt, path) {
  return `<div id="dplayer"></div>
          <div id="play-list"></div>
          <script>
          dp = new DPlayer({
            container: document.getElementById('dplayer'),
            theme: '#0070f3',
            video: {
              url: '${file['@microsoft.graph.downloadUrl']}',
              type: '${fileExt}'
            }
          })
          function updateLastestVideo(updatePath){
              let savedList = localStorage.getItem('latestVideoPath')||'{}'
              let route = updatePath.substr(0, updatePath.lastIndexOf("/"))
              let newFName = updatePath.split("/").pop()
              let saveObj = JSON.parse(savedList)
              if(saveObj[route]){
                //123.mkv.2 or 123.mkv
                let fname = saveObj[route].split("/").pop()
                let lastTime = parseInt(fname.split(".").pop())
                if(newFName===fname.substr(0, fname.lastIndexOf('.'))&&!isNaN(lastTime)){
                  dp.on("canplay", function(){
                    dp.seek(lastTime)
                  })
                }
              }
              saveObj[route] = updatePath
              localStorage.setItem('latestVideoPath', JSON.stringify(saveObj))
              localStorage.setItem('nowPlaying', newFName)
          }
          
          function initVideoPage(){
            localStorage.setItem('currentVideoPath', '${path}'.substr(0, '${path}'.lastIndexOf("/")))
            updateLastestVideo('${path}')
            let currentFile = '${file.name}'
            JSON.parse(localStorage.getItem('videoItems')).map(e=>{
              let li = document.createElement("li")
              let videoName = e.file.split("/").pop()
              li.innerHTML = videoName
              if(videoName === currentFile){
                  li.className = 'play-list-choose-one'    
              }
              li.onclick = (ele)=>{
                 if(ele.target.className !== 'play-list-choose-one'){
                     let hasNodes = document.getElementsByClassName('play-list-choose-one')
                     hasNodes.length>0&&hasNodes[0].classList.remove('play-list-choose-one')
                     ele.target.className = 'play-list-choose-one'
                     updateLastestVideo(e.file)
                      dp.switchVideo(
                          {url: e.url}
                      );
                      dp.play()
                 }
              }
              document.getElementById('play-list').appendChild(li)
            })
          }
          initVideoPage()
          dp.on("ended", function(){
            let hasNodes = document.querySelector('.play-list-choose-one + li')
            if(hasNodes){
              let e =  document.createEvent('mouseEvent')
              e.initEvent('click', true, true)
              hasNodes.dispatchEvent(e)  
            }
          })
          dp.on("fullscreen", function(){
            console.log("try do fullscreen landscape")
            if(screen.orientation && screen.orientation.lock){
              screen.orientation.lock('landscape')
            }
          })
          dp.on("fullscreen_cancel", function(){
            console.log("try do cancel fullscreen landscape")
             if(screen.orientation && screen.orientation.lock){
              screen.orientation.lock('natural')
            }
          })
          dp.on("loadedmetadata", function(e){
            console.log(e)
          })
          
          dp.on("loadstart", function(){
            let currentFile = '${file.name}'
            let vttItems = localStorage.getItem('vttItems');
            
            const loadedCb = (event) => {
              const buf = (event.target).result;
              //reader.removeEventListener('loadend', loadedCb);
                let text = 'WEBVTT FILE\\r\\n\\r\\n'.concat(toVTT(buf))
                let objectUrl = window.URL.createObjectURL(new Blob([text], { type: 'text/vtt' }));
                 let track = document.createElement("track");
                 let video = document.getElementsByClassName("dplayer-video")[0];
                  track.kind = "captions";
                  track.label = "Chinese";
                  track.srclang = "cn";
                  track.src = objectUrl;
                  track.addEventListener("load", function() {
                      this.mode = "showing";
                      video.textTracks[0].mode = "showing";
                  });
                  video.appendChild(track);
                  video.textTracks[0].mode = "showing";
            };
            
            const loadedCbAss = (event) => {
              const buf = (event.target).result;
              //reader.removeEventListener('loadend', loadedCb);
                let text = 'WEBVTT FILE\\r\\n\\r\\n'.concat(assToVTT(buf))
                let objectUrl = window.URL.createObjectURL(new Blob([text], { type: 'text/vtt' }));
                 let track = document.createElement("track");
                 let video = document.getElementsByClassName("dplayer-video")[0];
                  track.kind = "captions";
                  track.label = "Chinese";
                  track.srclang = "cn";
                  track.src = objectUrl;
                  track.addEventListener("load", function() {
                      this.mode = "showing";
                      video.textTracks[0].mode = "showing";
                  });
                  video.appendChild(track);
                  video.textTracks[0].mode = "showing";
            };
            //todo use this convert srt to ignore position info in srt  
            //srtReg:/(?:(\\d+):)?(\\d{1,2}):(\\d{1,2})[,\\.](\\d{1,3})\\s*(?:-->|,)\\s*(?:(\\d+):)?(\\d{1,2}):(\\d{1,2})[,\\.](\\d{1,3})\\r?\\n([.\\s\\S]+)/,
            //decodeFromSRT(input){
            //             if(!input) return;
            //             const data = [];
            //             let split = input.split('\\n\\n');
            //             if(split.length==1) split = input.split('\\r\\n\\r\\n');
            //             split.forEach(item=>{
            //                 const match = item.match(this.srtReg);
            //                 if (!match){
            //                     //console.log('跳过非正文行',item);
            //                     return;
            //                 }
            //                 data.push({
            //                     from:(match[1]*60*60||0) + match[2]*60 + (+match[3]) + (match[4]/1000),
            //                     to:(match[5]*60*60||0) + match[6]*60 + (+match[7]) + (match[8]/1000),
            //                     content:match[9].trim().replace(/{\\\\.+?}/g,'').replace(/\\\\N/gi,'\\n').replace(/\\\\h/g,' ')
            //                 });
            //             });
            //             return {body:data.sort((a,b)=>a.from-b.from)};
            //         }
            //
            const toVTT = (utf8str) => utf8str
                .replace(/\\{\\\\([ibu])\\}/g, '</$1>')
                .replace(/\\{\\\\([ibu])1\\}/g, '<$1>')
                .replace(/\\{([ibu])\\}/g, '<$1>')
                .replace(/\\{\\/([ibu])\\}/g, '</$1>')
                .replace(/(\\d\\d:\\d\\d:\\d\\d),(\\d\\d\\d)/g, '$1.$2')
                .concat('\\r\\n\\r\\n');
            const assToVTT = (utf8str) => {
                let assReg = /Dialogue:.*,(\\d+):(\\d{1,2}):(\\d{1,2}\\.?\\d*),\\s*?(\\d+):(\\d{1,2}):(\\d{1,2}\\.?\\d*)(?:.*?,){7}(.+)/
                 let splite = utf8str.split('\\n');
                const data = [];
                let begin = 1;
                for(let i = 0; i<splite.length; i++){
                    let line = splite[i];
                     let match = line.match(assReg);
                      if (!match){
                          //console.log('跳过非正文行',line);
                          continue;
                      }
                      let newLine = begin+"\\r\\n"+"0"+match[1] + ":" + match[2] + ":" + match[3]+"0 --> " 
                      + "0"+match[4] + ":" + match[5] + ":" + match[6] + "0\\r\\n" + (match[7]?match[7].trim().replace(/{\\\\.+?}/g,'').replace(/\\\\N/gi,'\\n').replace(/\\\\h/g,' '):"")
                      begin = begin+1
                      data.push(newLine)
                }
                
                let result = data.join('\\r\\n\\r\\n');
                return result
            }
          const $={};
          $.ajax = function(options){
              var type = options.type.toUpperCase() || 'GET';
              var resDataType = options.resDataType || 'string';
              var reqDataType = options.reqDataType || 'string';
              var url = options.url;
              var data = options.data;
              var success = options.success;
              var fail = options.fail;
              var progress = options.progress;
              var imgType = options.imgType || 'jpg';
              var xhr = new XMLHttpRequest();
              xhr.open(type,url);
              if(resDataType==='blob'){
                  xhr.responseType = 'blob';
              }
              if(type==='GET'){
                  xhr.send(null)
              }
              else if(type==='POST') {
                  if(progress){
                      xhr.upload.onprogress = progress;
                  }
                  if(reqDataType==='json'){
                      xhr.setRequestHeader('Content-Type','application/json;charset=UTF-8');
                      data = JSON.stringify(data);  //只能发送字符串格式的json,不能直接发送json
                  }
                  if(reqDataType==='string'){
                      xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
                  }
                  xhr.send(data);
              }
              xhr.onreadystatechange = function(){
                  if(this.readyState===4 && (this.status>=200 && this.status<300)){
                      var res;
                      if(resDataType==='json'){
                          res = JSON.parse(this.responseText);
                          success.call(this,res,this.responseXML)
                      }
                      if(resDataType==='blob'){
                          res = new Blob([this.response],{type:'text/srt'});
                          success.call(this,res)
                      }
          
                  }
              };
          };
              let searchSt = true;
            //移除字幕
            let video = document.getElementsByClassName("dplayer-video")[0];
            if(video){
              if(video.textTracks&&video.textTracks.length>0){
                video.textTracks[0].mode = 'disabled'
              }
              video.innerHTML = '';
            }
            vttItems&&JSON.parse(vttItems).forEach(e=>{
              let vttName = e.file.split("/").pop()
              let vttNameArr = vttName.split(".");
              let endfix = vttNameArr[vttNameArr.length-1];
              let nowPlaying = localStorage.getItem('nowPlaying')
              nowPlaying = nowPlaying?nowPlaying:"";
              let nowCompare = decodeURI(nowPlaying);
              if(searchSt&&vttName.startsWith(nowCompare.substr(0, nowCompare.lastIndexOf(".")))){
                searchSt = false;
                  $.ajax({
                    type:'GET',
                    url:e.url,
                    resDataType:'blob',
                    success:function(resText,resXML){
                        if(endfix.toLowerCase() == 'srt'){
                             const reader = new FileReader();
                            reader.addEventListener('loadend', loadedCb);
                            let textSrt = reader.readAsText(resText);
                        }else if(endfix.toLowerCase() == 'ass'){
                             const reader = new FileReader();
                            reader.addEventListener('loadend', loadedCbAss);
                            let textSrt = reader.readAsText(resText);
                        }else{
                            let track = document.createElement("track");
                           let video = document.getElementsByClassName("dplayer-video")[0];
                            track.kind = "captions";
                            track.label = "Chinese";
                            track.srclang = "cn";
                            track.src = e.url;
                            video.appendChild(track);
                            video.textTracks[0].mode = "showing";
                        }
                    },
                    fail:function(err){
                       console.log(err)
                    }
                  });
              }
            })
          })
          
          </script><style>.play-list-choose-one{color: #b9edff}</style>`
}

/**
 * Render audio (mp3, aac, wav, oga ...)
 *
 * @param {Object} file Object representing the audio to preview
 */
function renderAudioPlayer(file) {
  return `<div id="aplayer"></div>
          <script>
          ap = new APlayer({
            container: document.getElementById('aplayer'),
            theme: '#0070f3',
            audio: [{
              name: '${file.name}',
              url: '${file['@microsoft.graph.downloadUrl']}'
            }]
          })
          </script>`
}

/**
 * File preview fallback
 *
 * @param {string} fileExt The file extension parsed
 */
function renderUnsupportedView(fileExt) {
  return `<div class="markdown-body" style="margin-top: 0;">
            <p>Sorry, we don't support previewing <code>.${fileExt}</code> files as of today. You can download the file directly.</p>
          </div>`
}

/**
 * Render preview of supported file format
 *
 * @param {Object} file Object representing the file to preview
 * @param {string} fileExt The file extension parsed
 */
async function renderPreview(file, fileExt, cacheUrl, path) {
  if (cacheUrl) {
    // This will change your download url too! (proxied download)
    file['@microsoft.graph.downloadUrl'] = cacheUrl
  }

  switch (extensions[fileExt]) {
    case preview.markdown:
      return await renderMarkdown(file['@microsoft.graph.downloadUrl'], '', 'style="margin-top: 0;"')

    case preview.text:
      return await renderCodePreview(file, '')

    case preview.image:
      return renderImage(file)

    case preview.code:
      return await renderCodePreview(file, fileExt)

    case preview.pdf:
      return renderPDFPreview(file)

    case preview.video:
      return renderVideoPlayer(file, fileExt, path)

    case preview.audio:
      return renderAudioPlayer(file)

    default:
      return renderUnsupportedView(fileExt)
  }
}

export async function renderFilePreview(file, path, fileExt, cacheUrl) {
  const el = (tag, attrs, content) => `<${tag} ${attrs.join(' ')}>${content}</${tag}>`
  const div = (className, content) => el('div', [`class=${className}`], content)

  const body = div(
    'container',
    div('path', renderPath(path) + ` / ${file.name}`) +
      div('items', el('div', ['style="padding: 1rem 1rem;"'], await renderPreview(file, fileExt, cacheUrl, path))) +
      div(
        'download-button-container',
        el(
          'a',
          ['class="download-button"', `href="${file['@microsoft.graph.downloadUrl']}"`, 'data-turbolinks="false"'],
          '<i class="far fa-arrow-alt-circle-down"></i> DOWNLOAD'
        )
      )
  )
  return renderHTML(body)
}
