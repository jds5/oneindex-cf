import { favicon } from './favicon'

const COMMIT_HASH = 'b91e72d'

const pagination = (pIdx, attrs) => {
  const getAttrs = (c, h, isNext) =>
    `class="${c}" ${h ? `href="pagination?page=${h}"` : ''} ${isNext === undefined ? '' : `id=${c.includes('pre') ? 'pagination-pre' : 'pagination-next'}`
    }`
  if (pIdx) {
    switch (pIdx) {
      case pIdx < 0 ? pIdx : null:
        attrs = [getAttrs('pre', -pIdx - 1, 0), getAttrs('next off', null)]
        break
      case 1:
        attrs = [getAttrs('pre off', null), getAttrs('next', pIdx + 1, 1)]
        break
      default:
        attrs = [getAttrs('pre', pIdx - 1, 0), getAttrs('next', pIdx + 1, 1)]
    }
    return `${`<a ${attrs[0]}><i class="fas fa-angle-left" style="font-size: 8px;"></i> PREV</a>`}<span>Page ${pIdx}</span> ${`<a ${attrs[1]}>NEXT <i class="fas fa-angle-right" style="font-size: 8px;"></i></a>`}`
  }
  return ''
}

export function renderHTML(body, pLink, pIdx, cVideoList, vttList) {
  pLink = pLink || ''
  cVideoList = cVideoList && JSON.stringify(cVideoList)
  vttList = vttList && JSON.stringify(vttList)
  const p = 'window[pLinkId]'

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta http-equiv="x-ua-compatible" content="ie=edge, chrome=1" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
      <title>yangchm's OneDrive</title>
      <link rel="shortcut icon" type="image/png" sizes="16x16" href="${favicon}" />
      <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.13.1/css/all.min.css" rel="stylesheet">
      <link href="https://cdn.jsdelivr.net/gh/jds5/oneindex-cf@${COMMIT_HASH}/themes/spencer.css" rel="stylesheet">
      <link href="https://cdn.jsdelivr.net/gh/sindresorhus/github-markdown-css@gh-pages/github-markdown.css" rel="stylesheet">
      <link href="https://cdn.jsdelivr.net/gh/jds5/oneindex-cf@${COMMIT_HASH}/themes/prism-github.css" rel="stylesheet">
      <link href="https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css" rel="stylesheet">
      <script src="https://cdn.jsdelivr.net/npm/prismjs@1.17.1/prism.min.js" data-manual></script>
      <script src="https://cdn.jsdelivr.net/npm/prismjs@1.17.1/plugins/autoloader/prism-autoloader.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/medium-zoom@1.0.6/dist/medium-zoom.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/turbolinks@5.2.0/dist/turbolinks.min.js"></script>
      <script src="https://cdn.jsdelivr.net/gh/pipwerks/PDFObject/pdfobject.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/flv.js@1.5.0/dist/flv.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/dplayer@1.26.0/dist/DPlayer.min.js"></script>
    </head>
    <body>
      <nav id="navbar" data-turbolinks-permanent>
        <div class="brand">📁 yangchm's public onedrive</div>
        <a href="https://down.megumi.ml" target="_blank" style="display: block; text-align: right; flex: 1;">aria2</a>
        <a href="https://nyaa.si/?f=0&c=1_3&q=" target="_blank" style="display: block; margin-left: 10px; margin-right: 10px;">nyaa</a>
      </nav>
      ${body}
      <div class="paginate-container">${pagination(pIdx)}</div>
        <div id="flex-container" data-turbolinks-permanent style="flex-grow: 1;"></div>
      <a id="lastest-video" style=""></a>
      <footer id="footer" data-turbolinks-permanent><p>By yangchm, hosted on cf.</p></footer>
      <script>
        if (typeof ap !== "undefined" && ap.paused !== true) {
          ap.destroy()
          ap = undefined
        }
        
        function beforeDestroy(){
           let route = localStorage.getItem('currentVideoPath')
            let saveObj = JSON.parse(localStorage.getItem('latestVideoPath')||'{}')
            let element = saveObj[route]
            if(element){
                let lastTime = parseInt(element.split("/").pop().split(".").pop())
                if(!isNaN(lastTime)){
                  element = element.substr(0, element.lastIndexOf('.'))
                }
                saveObj[route] = element+"."+parseInt(dp.video.currentTime)
            }
            localStorage.setItem('latestVideoPath', JSON.stringify(saveObj))
        }
        
        if (typeof dp !== "undefined" && dp.paused !== true) {
          beforeDestroy()
          dp.destroy()
          dp = undefined
        }
        
        function loadHistory(){
          let url = location.pathname
          let saveLatestVideos = localStorage.getItem('latestVideoPath')
          if(false){//url === "/"
              if(saveLatestVideos){
                let saveObj = JSON.parse(saveLatestVideos)
                // Object.keys(saveObj).map(key=>{
                //     saveObj[key]
                // })
                // latestVideo = document.getElementById('lastest-video')
                // latestVideo.innerHTML = decodeURI(localStorage.getItem('latestVideoPath')).split("/").pop()
                // latestVideo.href = 'https://onedrive.megumi.ml/'+localStorage.getItem('latestVideoPath')
              }
          }else{
              url = url.endsWith("/")?url.substr(0, url.length-1):url
              if(saveLatestVideos){
                let saveObj = JSON.parse(saveLatestVideos)
                let targetVideo = saveObj[url]
                if(targetVideo){
                  let lastTime = parseInt(targetVideo.split("/").pop().split(".").pop())
                  if(!isNaN(lastTime)){
                    targetVideo = targetVideo.substr(0, targetVideo.lastIndexOf('.'))
                  }
                  let latestVideo = document.getElementById('lastest-video')
                  latestVideo.innerHTML = decodeURI(targetVideo).split("/").pop()
                  latestVideo.href = 'https://onedrive.megumi.ml/'+targetVideo
                }
              }
          }
        }
        loadHistory()
        
        Prism.highlightAll()
        mediumZoom('[data-zoomable]')
        Turbolinks.Location.prototype.isHTML = () => {return true}
        Turbolinks.start()
        pagination()

        function pagination() {
          if ('${pLink ? 1 : ''}') {
            if (location.pathname.endsWith('/')) {
              pLinkId = history.state.turbolinks.restorationIdentifier
              ${p} = { link: ['${pLink}'], idx: 1 }
            } else if (!window.pLinkId) {
              history.pushState(history.state, '', location.pathname.replace('pagination', '/'))
              return
            }
            if (${p}.link.length < ${p}.idx) (${p} = { link: [...${p}.link, '${pLink}'], idx: ${p}.idx })
          }
          listen = ({ isNext }) => {
            isNext ? ${p}.idx++ : ${p}.idx--
            addEventListener(
              'turbolinks:request-start',
              event => {
                const xhr = event.data.xhr
                xhr.setRequestHeader('pLink', ${p}.link[${p}.idx -2])
                xhr.setRequestHeader('pIdx', ${p}.idx + '')
              },
              { once: true }
            )
          }
          preBtn = document.getElementById('pagination-pre')
          nextBtn = document.getElementById('pagination-next')
          if (nextBtn) {
            nextBtn.addEventListener('click', () => listen({ isNext: true }), { once: true })
          }
          if (preBtn) {
            preBtn.addEventListener('click', () => listen({ isNext: false }), { once: true })
          }
        }
        
        '${cVideoList}'!=='undefined'&&localStorage.setItem('videoItems', '${cVideoList}')
        '${vttList}'!=='undefined'&&localStorage.setItem('vttItems', '${vttList}')
      </script>
    </body>
  </html>`
}
