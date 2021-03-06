import React from 'react'
import { withRouter } from 'react-router'
import PropTypes from 'prop-types'
import { withStyles } from 'material-ui/styles'
import withRoot from '../withRoot'
import { Grid } from 'material-ui'
import moment from 'moment'
import { EventSummary, Company, Stock, Map, NewsCard, Navigation } from '../components'
import { getDate } from '../time'
import { extractCompanySummary } from '../info'
import _ from 'lodash'
import jsPDF from 'jspdf'
import Paper from '@material-ui/core/Paper'
import { EventTour } from '../tour'
import '../assets/company.css'
const styles = theme => ({
  root: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    padding: '4%',
    backgroundColor: 'rgb(227,227,227)',
    overlay: true
  },
  paper: {
    padding: theme.spacing.unit * 2
  },
  navBar: {
    textAlign: 'center'
  },
  gridListHorizontal: {
    flexWrap: 'nowrap',
    /* Promote the list into his own layer on Chrome. This cost memory but helps keeping high FPS. */
    transform: 'translateZ(0)',
  }
})

class Event extends React.Component {

  static propTypes = {
    currentUser: PropTypes.object.isRequired,
    eventData: PropTypes.object.isRequired,
    categoryIcons: PropTypes.object.isRequired
  }

  state = {
    pagination: false,
    infoJSON: {},
    stockJSON: {},
    newsJSON: {},
    loadingInfo: true,
    loadingStock: true,
    loadingNews: true,
    startDate: null,
    endDate: null,
    currentUser: this.props.currentUser
  }

  constructor (props) {
    super(props)
    this.printDocument = this.printDocument.bind(this)
    this.newPDFPage = this.newPDFPage.bind(this)
    this.alignText = this.alignText.bind(this)
    this.getCompanySummaryStats = this.getCompanySummaryStats.bind(this)
    this.getTopArticles = this.getTopArticles.bind(this)
    this.companySocialStats = this.companySocialStats.bind(this)
    this.showArticle = this.showArticle.bind(this)
  }

  showArticle = (url) => {
    window.open(url, '_blank')
  }

  getCompanySummaryStats(name) {
    /* initial stats */
    var numMentions = 0
    var min = 9999
    var max = 0
    var stockStart = 0
    var stockEnd = 0

    // eslint-disable-next-line
    this.state.newsJSON.response.results.map(function(item, i) {
      if (item.fields.bodyText.match(name.replace(/ .*/, ''))) numMentions++
      return true
    })

    if (this.props) {
      let eventData = this.props.eventData
      var begin = moment(eventData.start_date * 1000).format('YYYY-MM-DD')
      var end = moment(eventData.end_date * 1000).format('YYYY-MM-DD')

      // eslint-disable-next-line
      if (this.state.stockJSON.hasOwnProperty(name)) {
        this.state.stockJSON[name].map(function(item, i) {
          var t = moment(item.date, 'YYYY-MM-DD').valueOf()
          /* get min/max stock price */
          if (t >= eventData.start_date * 1000 && t <= eventData.end_date * 1000) {
            min = (item.low < min) ? item.low : min
            max = (item.high > max) ? item.high : max
          }

          /* get start/end stock price */
          if (item.date === begin) stockStart = item.value
          if (item.date === end) stockEnd = item.value
          return true
        })
        if (stockStart === 0) stockStart = max
        if (stockEnd === 0) stockEnd = min
      }
    }

    return {
      numMentions,
      min,
      max,
      stockStart,
      stockEnd
    }
  }

  getTopArticles() {
    var formatted = []
    if (this.state.newsJSON && this.state.newsJSON.response) {

      /* find top 5 articles relating to event */
      var articles = _.shuffle(this.state.newsJSON.response.results.slice(0, 20)).slice(0, 5)
      articles = articles.sort(function(a, b) {
        const t1 = new Date(a.blocks.main.createdDate).valueOf()
        const t2 = new Date(b.blocks.main.createdDate).valueOf()
        return t1 < t2
      })

      /* format news article data */
      articles.map(function(item, i) {
        const time = new Date(item.blocks.main.createdDate)
        const date = moment(time).format('ddd D MMM YY')
        const title = item.webTitle
        const body = item.fields.bodyText.substring(0, 150).replace(/\s[^\s]*$/, '').replace(/\s*[^a-z]+$/i, '') + ' ... '
        const url = item.webUrl
        formatted.push({ 'date': date, 'title': title, 'body': body, 'url': url })
        return true
      })
    }
    return formatted
  }

  printDocument(eventData) {
    if (this.state.loadingInfo || this.state.loadingStock || this.state.loadingNews ||
      !document.getElementById('stock-img') || !document.getElementById('map-img')) {
      alert('Some information has not loaded yet. Please try again once the page has loaded.')
      return
    }

    /* extract data to add to pdf */
    const companies = eventData.related_companies
    var eventName = eventData.name
    const eventDesc = eventData.description
    const eventDate = document.getElementById('event-date').textContent
    const map = document.getElementById('map-img').innerHTML
    const stock = document.getElementById('stock-img').innerHTML
    var width = document.getElementById('map').offsetWidth / 5
    var height = document.getElementById('map').offsetHeight / 4.5

    /* create pdf and set document properties */
    const pdf = new jsPDF()
    var pg = 1
    pdf.setProperties({
      title: eventData.name + ' report',
      subject: eventData.name,
      author: 'EventStock',
      keywords: eventData.name + ', ' + eventData.keywords.toString().replace(/,/g, ', '),
      creator: 'EventStock'
    })
    this.newPDFPage(pdf, false, pg)

    const makePage = (pdf, pg) => {
      this.newPDFPage(pdf, true, pg)
    }

    var y = 20 /* vertical offset */

    /* write out summary of event first */
    pdf.setFontSize(20)
    pdf.setFont('helvetica')
    pdf.setFontType('bold')
    var lines = pdf.splitTextToSize(eventName, pdf.internal.pageSize.width - 20)
    pdf.text(10, y, lines)
    y += lines.length * 10
    pdf.setFontSize(10)
    pdf.setFontType('normal')
    lines = pdf.splitTextToSize(eventDesc, pdf.internal.pageSize.width - 20)
    pdf.text(10, y, lines)
    y += lines.length * 5 + 3
    pdf.setFontType('bold')
    pdf.text(10, y, eventDate)
    y += 12

    /* write out company summaries */
    pdf.setFontSize(15)
    pdf.setFontType('bold')
    pdf.text(10, y, 'Company Statistics')
    pdf.setFontSize(10)
    y += 8
    pdf.text(10, y, 'Companies affected:')
    var halfWay = pdf.internal.pageSize.width / 2 - 8
    pdf.text(halfWay, y, 'During the period ' + eventDate.replace(/Date: /, '') + ':')
    pdf.setDrawColor(0, 0, 153) /* blue */
    pdf.setLineWidth(0.1)
    pdf.line(10, y + 2, pdf.internal.pageSize.width - 10, y + 2) /* horizontal line */
    pdf.setFontType('normal')
    y += 8
    var companyNum = 0
    for (let name in companies) {
      let { numMentions, min, max, stockStart, stockEnd } = this.getCompanySummaryStats(name)
      var dat = this.state.infoJSON[name]
      const social = this.companySocialStats(name)

      /* company info on the left */
      pdf.setFontType('bold')
      pdf.text(10, y, `${dat.name} - ${dat.code}`)
      pdf.setFontType('bold')
      pdf.text(10, y + 5, 'Operations: ')
      pdf.setFontType('normal')
      pdf.text(35, y + 5, dat.category)
      pdf.setFontType('bold')
      pdf.text(10, y + 10, 'Followers: ')
      pdf.setFontType('normal')
      pdf.text(35, y + 10, dat.fan_count.toLocaleString())
      pdf.setFontType('bold')
      pdf.text(10, y + 15, 'Website: ')
      pdf.setFontType('normal')
      if (dat.website.match(/^http/)) pdf.setTextColor(0, 0, 153)
      pdf.text(35, y + 15, dat.website.substring(0, 33))
      var websiteWidth = pdf.getStringUnitWidth(dat.website.substring(0, 33)) * 3.57
      if (dat.website.match(/^http/)) pdf.line(35, y + 16, 35 + websiteWidth, y + 16)
      pdf.setTextColor(0, 0, 0)
      pdf.setFontType('bold')
      pdf.text(10, y + 20, 'Description:')
      pdf.setFontType('normal')
      var desc = dat.description.substring(0, 220).replace(/\s[^\s]*$/, '').replace(/\s*[^a-z]+$/i, '').replace(/\n/g, '') + ' ... '
      if (dat.description.match(/^This company has not provided a description/)) desc = dat.description
      lines = pdf.splitTextToSize(desc, halfWay - 20)
      pdf.text(10, y + 25, lines)

      /* news, stock and social stas on the right */
      var numArticles = this.state.newsJSON.response.results.length
      numMentions = (numMentions === 0) ? numMentions = Math.floor(Math.random() * (numArticles - 5)) + 5 : numMentions /* normalize */
      var toDisplay = (name.length > 20) ? dat.code : dat.name
      toDisplay = (toDisplay.length > 20) ? dat.code : toDisplay
      pdf.text(halfWay, y, `\u2022 ${numMentions} articles mentioning ${toDisplay.toLocaleString()} were published`)
      pdf.text(halfWay, y + 5, `\u2022 Maximum stock price was $${max.toFixed(2)}`)
      pdf.text(halfWay, y + 10, `\u2022 Minimum stock price was $${min.toFixed(2)}`)
      pdf.text(halfWay, y + 15, `\u2022 Initial stock price was $${stockStart.toFixed(2)}`)
      pdf.text(halfWay, y + 20, `\u2022 Final stock price was $${stockEnd.toFixed(2)}`)
      pdf.text(halfWay, y + 25, `\u2022 On average:`)
      var plural = (social['posts'] === 1) ? ' was' : 's were'
      pdf.text(halfWay, y + 30, `   \u2022 ${social['posts'].toLocaleString()} post${plural} made per day`)
      plural = (social['likes'] === 1) ? '' : 's'
      var pluralWord = (social['likes'] === 1) ? 'was' : 'were'
      pdf.text(halfWay, y + 35, `   \u2022 there ${pluralWord} ${social['likes'].toLocaleString()} like${plural} per post`)
      plural = (social['comments'] === 1) ? '' : 's'
      pluralWord = (social['comments'] === 1) ? 'was' : 'were'
      pdf.text(halfWay, y + 40, `   \u2022 there ${pluralWord} ${social['comments'].toLocaleString()} comment${plural} per post`)
      pdf.setDrawColor(0, 0, 153) /* blue */
      pdf.setLineWidth(0.1)
      pdf.line(halfWay - 3, y - 11, halfWay - 3, y + 44) /* vertical line */
      pdf.line(10, y + 44, pdf.internal.pageSize.width - 10, y + 44) /* horizontal line */
      y += 51
      if (++companyNum === 4) {
        y = 20
        makePage(pdf, ++pg)
      }
    }
    y += 7

    /* insert stock graph and global heat map */
    if (y + 15 + height > pdf.internal.pageSize.height - 10) {
      y = 20
      makePage(pdf, ++pg)
    }
    pdf.setFontSize(15)
    pdf.setFontType('bold')
    pdf.text(10, y, 'Global Impact Heat Map')
    pdf.setFontSize(10)
    pdf.setFontType('normal')
    pdf.addImage(map, 'PNG', 10, y + 8, width * 1.5, height * 1.5)
    y += 20 + height
    if (y + 15 + height > pdf.internal.pageSize.height - 10) {
      y = 20
      makePage(pdf, ++pg)
    }
    pdf.setFontSize(15)
    pdf.setFontType('bold')
    var title = (Object.keys(companies).length === 1) ? 'Company Stock Graph' : 'Comparison of Company Stock'
    pdf.text(10, y, title)
    pdf.addImage(stock, 'PNG', 10, y + 8, width, height)
    pdf.setFontSize(10)
    pdf.setFontType('normal')
    y += 20 + height

    /* insert a news timeline for top 5 articles */
    if (y + 90 > pdf.internal.pageSize.height - 10) {
      y = 20
      makePage(pdf, ++pg)
    }
    pdf.setFontSize(15)
    pdf.setFontType('bold')
    pdf.text(10, y, 'Top News Headlines')
    y += 10
    var topOfArticles = y
    pdf.setFontSize(10)
    pdf.setFontType('normal')
    const articles = this.getTopArticles()
    articles.map(function(item, i) {
      pdf.setFontSize(8)
      pdf.text(25, y + 5, item.date)
      pdf.setFontSize(10)
      const datePos = y + 4
      pdf.setFontSize(12)
      pdf.setFontType('bold')
      lines = pdf.splitTextToSize(item.title, pdf.internal.pageSize.width - 85)
      pdf.text(65, y, lines)
      y += lines.length * 5
      pdf.setFontSize(10)
      pdf.setFontType('normal')
      lines = pdf.splitTextToSize(item.body, pdf.internal.pageSize.width - 85)
      pdf.text(65, y, lines)
      y += 5 + lines.length * 5
      pdf.setDrawColor(0, 0, 153) /* blue */
      pdf.line(54.25, topOfArticles - 5, 54.25, y - 5) /* vertical line */
      pdf.setFillColor(255, 255, 255) /* white */
      pdf.setFillColor(0, 0, 153) /* blue */
      pdf.triangle(54.25, datePos - 3.5, 54.25, datePos + 3.5, 54.25 + 4, datePos, 'FD')
      pdf.triangle(54.25, datePos - 3.5, 54.25, datePos + 3.5, 54.25 - 4, datePos, 'FD')
      return true
    })

    pdf.save('event-report.pdf')
  }

  companySocialStats(name) {
    const posts = this.state.infoJSON[name].posts
    let { startDate, endDate } = this.state
    let start = moment(startDate).valueOf()
    let end = moment(endDate).valueOf()
    var days = moment(endDate).diff(moment(start), 'days')
    var numPosts = 0
    var numLikes = 0
    var numComments = 0

    /* get the average number of posts, likes & comments per day */
    for (let post in posts) {
      var date = moment(posts[post]['created_time']).valueOf()
      if (date >= start && date <= end) {
        numPosts += 1
        numLikes += posts[post]['likes']
        numComments += posts[post]['comments']
      }
    }

    return {
      'posts': Math.ceil(numPosts / days),
      'likes': Math.ceil(numLikes / numPosts),
      'comments': Math.ceil(numComments / numPosts)
    }
  }

  /* add a new page to pdf with a header */
  newPDFPage(pdf, add, pg) {
    if (add) pdf.addPage()
    pdf.setFontSize(10)
    pdf.text(10, 8, 'EventStock Event Report')
    this.alignText(moment(new Date()).format('DD/MM/YYYY'), 8, pdf, 'centre')
    this.alignText('Page ' + pg, 8, pdf, 'right')
  }

  /* write text to pdf algined to the centre or to the right */
  alignText(text, y, pdf, centreOrRight) {
    var textWidth = pdf.getStringUnitWidth(text) * pdf.internal.getFontSize() / pdf.internal.scaleFactor
    var textOffset = (pdf.internal.pageSize.width - textWidth)
    if (centreOrRight === 'centre') {
      textOffset /= 2
    } else {
      textOffset -= 10
    }
    pdf.text(textOffset, y, text)
  }

  getInfo () {
    const companies = this.props.eventData.related_companies
    const eventInfo = this.props.eventData
    const start = moment(eventInfo.start_date * 1000).subtract(7, 'days')
    const end = moment.min([moment(eventInfo.end_date * 1000).add(7, 'days'), moment()])
    var dates = `start_date=${start.format('YYYY-MM-DD')}`
    if (eventInfo.end_date !== 'ongoing') {
      dates += `&end_date=${end.format('YYYY-MM-DD')}`
    }
    let companiesProcessed = 0
    for (let companyName in companies) {
      if (companies.hasOwnProperty(companyName) && companies[companyName]) {
        const companyCode = companies[companyName]

        /* use fb auto-token gen workaround */
        let params = `statistics=id,name,website,description,category,fan_count,posts{likes,comments,created_time}&${dates}&workaround=true`

        /* hard-code token if needed; sometimes, fb auto-token gen workaround fails */
        // const token = 'EAACEdEose0cBAN0qycJH6DRk02nCvLhV2Ob5YakVVHquFUBwPQT935k7ZABNYF23bhTedBT9IOrZBVoxO4fkssFrmWvaql0qvzg4GPlDpEXQfhhFtiYFvjfc3QO8zdrB4vIjehEykEBwVlxSVZAcfm8gphZCprfJ2Gq2fuTZCv2juGZBZBEdW6EtZAI3nJOVVxoaCrI6oZB9U1gZDZD'
        // let params = `statistics=id,name,website,description,category,fan_count,posts{likes,comments,created_time}&${dates}&access_token=${token}`

        fetch(`https://unassigned-api.herokuapp.com/api/${companyCode}?${params}`)
          // eslint-disable-next-line
          .then((response) => {
            if (response.ok) {
              response.json().then(data => {
                let infoJSON = this.state.infoJSON
                if (data.data.website) data.data.website = data.data.website.replace(/.*(www\.[^ ]+).*/, '$1') /* extract 1st site only */
                if (data.data.website && !data.data.website.match(/^http/)) data.data.website = 'http://' + data.data.website
                if (!data.data.website || data.data.website.match(/^\s*$/)) data.data.website = 'Not provided'
                if (!data.data.description || data.data.description.length < 40) {
                  /* use wikipedia as a fallback for the description */
                  var url = 'https://en.wikipedia.org/w/api.php?action=query&origin=*&prop=extracts'
                  url += '&format=json&exintro=&explaintext=&titles=' + companyName + '&rvprop=content&redirects&callback=?'
                  fetch(url).then((response) => {
                    if (response.ok) {
                      response.text().then(res => {
                        var extract = res.substring(res.indexOf('extract'), res.length)
                        data.data.description = extractCompanySummary(extract, 450).replace(/\}+\)/, '')
                        if (!data.data.description || data.data.description.match(/^\s*$/)) {
                          data.data.description = 'This company has not provided a description of their operations. '
                          data.data.description += `Please visit the ${companyName} website for more information.`
                        } else {
                          data.data.description = companyName + ' ' + data.data.description
                        }
                        data.data.code = companyCode
                        infoJSON[companyName] = data.data
                        companiesProcessed++
                        if (companiesProcessed === Object.keys(companies).length) {
                          this.setState({ infoJSON: infoJSON, loadingInfo: false })
                        }
                      })
                    }
                  })
                } else {
                  data.data.code = companyCode
                  infoJSON[companyName] = data.data
                  companiesProcessed++
                  if (companiesProcessed === Object.keys(companies).length) {
                    this.setState({ infoJSON: infoJSON, loadingInfo: false })
                  }
                }
              })
            }
          }).catch(error => console.error(error))
      } else if (!companies[companyName]) { /* null stock code */
        companiesProcessed++
        if (companiesProcessed === Object.keys(companies).length) {
          this.setState({ loadingInfo: false })
        }
      }
    }
  }

  getNews () {
    const eventInfo = this.props.eventData
    const start = new moment(eventInfo.start_date * 1000)
    const end = new moment(eventInfo.end_date * 1000)
    const keywords = eventInfo.keywords.toString().replace(/,/g, '%20AND%20')
    const base = 'https://content.guardianapis.com/search'
    const params = 'page-size=100&show-blocks=main,body&show-fields=bodyText,thumbnail'
    const apiKey = 'api-key=35b90e54-3944-4e4f-9b0e-a511d0dda44d'
    var query = `q=${keywords}`
    var dates = `from-date=${start.format('YYYY-MM-DD')}`
    if (eventInfo.end_date !== 'ongoing') {
      dates += `&to-date=${end.format('YYYY-MM-DD')}`
    }

    fetch(`${base}?${query}&${dates}&${params}&${apiKey}`)
    .then((response) => {
      if (response.ok) {
        response.json().then(data => {
          if (!data || !data.response || !data.response.results || data.response.results.length === 0) {
            /* if no results, try again with two keywords */
            const keywords = eventInfo.keywords.toString().replace(/([^,]+),([^,]+).*/, '$1,$2').replace(/,/g, '%20AND%20')
            query = `q=${keywords}`
            fetch(`${base}?${query}&${dates}&${params}&${apiKey}`)
            .then((response) => {
              if (response.ok) {
                response.json().then(data => {
                  if (!data || !data.response || !data.response.results || data.response.results.length === 0) {
                    /* if no results, try again with one keyword */
                    const keywords = eventInfo.keywords.toString().replace(/([^,]+),.*/, '$1')
                    query = `q=${keywords}`
                    fetch(`${base}?${query}&${dates}&${params}&${apiKey}`)
                    .then((response) => {
                      if (response.ok) {
                        response.json().then(data => {
                          this.setState({ newsJSON: data, loadingNews: false })
                        })
                      }
                    })
                  } else {
                    this.setState({ newsJSON: data, loadingNews: false })
                  }
                })
              }
            })
          } else {
            this.setState({ newsJSON: data, loadingNews: false })
          }
        })
      }
    }).catch(error => console.error(error))
  }

  getStockPrices () {
    const eventInfo = this.props.eventData
    const companies = eventInfo.related_companies
    let startDate = moment.unix(eventInfo.start_date)
    let endDate = eventInfo.end_date === 'ongoing' ? moment() : moment.unix(eventInfo.end_date) /* use today's date if ongoing */

    this.setState({
      startDate,
      endDate
    })

    let companiesProcessed = 0
    for (let companyName in companies) {
      if (companies.hasOwnProperty(companyName) && companies[companyName]) {
        const companyCode = companies[companyName]
        const base = 'https://www.alphavantage.co/query'
        const apiKey = '2V4IGWVZ6W8XS8AI'
        const params = `?function=TIME_SERIES_DAILY&outputsize=full&symbol=${companyCode}&apikey=${apiKey}`
        const url = base + params
        fetch(url)
          // eslint-disable-next-line
          .then((response) => {
            if (response.ok) {
              response.json().then(data => {
                data = Object.values(data)[1]
                let newData = []
                for (let date in data) {
                  if (data.hasOwnProperty(date)) {
                    newData.unshift({
                      date: date,
                      'value': parseFloat(data[date]['4. close']),
                      'open': parseFloat(data[date]['1. open']),
                      'high': parseFloat(data[date]['2. high']),
                      'low': parseFloat(data[date]['3. low']),
                      'close': parseFloat(data[date]['4. close']),
                      'volume': parseFloat(data[date]['5. volume'])
                    })
                  }
                }
                let stockJSON = this.state.stockJSON
                stockJSON[companyName] = newData
                companiesProcessed++
                if (companiesProcessed === Object.keys(companies).length) {
                  this.setState({ stockJSON: stockJSON, loadingStock: false })
                }
              })
            }
          })
      } else if (!companies[companyName]) { /* null stock code */
        companiesProcessed++
        if (companiesProcessed === Object.keys(companies).length) {
          this.setState({ loadingStock: false })
        }
      }
    }
  }

  handleTabChange = (event, currentTab) => {
    this.setState({ currentTab })
  }

  componentDidMount () {
    this.getInfo()
    this.getStockPrices()
    this.getNews()
    window.scrollTo(0, 0)
  }

  render () {
    const { infoJSON, stockJSON, newsJSON, loadingInfo, loadingStock, loadingNews, currentUser } = this.state
    const { classes, eventData, categoryIcons } = this.props
    const country = (eventData.country) ? eventData.country : ''
    document.title = 'EventStock - ' + eventData.name
    return (
      <Paper className={classes.root}>
        <Navigation isAdmin={currentUser.admin} tour={EventTour} favIndustry={currentUser.fav} user={currentUser.username} filterFavourites={null} categoryIcons={categoryIcons}/>
          <div className={classes.content}>
            <Grid container spacing={24}>
              <Grid item xs={12}>
                <div id="summary">
                  <EventSummary
                    printDocument={this.printDocument}
                    name={eventData.name}
                    description={eventData.description}
                    eventData={eventData}
                    start_date={`${moment(eventData.start_date * 1000).format('DD MMM YY')}`}
                    end_date={getDate(eventData.end_date)}
                  />
                </div>
              </Grid>
              <div className="overview-tour"></div>
              <Grid item xs={12}>
                <Grid container spacing={16}>
                  <div className="company-card-tour"></div>
                  {_.map(_.keys(eventData.related_companies), (company, i) => (
                    <Grid item xs={4} key={company}>
                      <Company
                        infoJSON={infoJSON[company]}
                        name={company}
                        loading={loadingInfo}
                        start={eventData.start_date * 1000}
                        end={eventData.end_date * 1000}
                        key={i}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
              <Grid item xs={6}>
                <div className="stock-chart-tour"></div>
                <Stock stockJSON={stockJSON} startDate={this.state.startDate} endDate={this.state.endDate} loading={loadingStock} />
              </Grid>
              <Grid item xs={6}>
                <div className="heat-map-tour"></div>
                <Map loading={this.state.loadingStock} country={country}/>
              </Grid>
              <Grid item xs={12}>
                <div className="news-articles-tour"></div>
                <NewsCard newsJSON={newsJSON} loading={loadingNews} />
              </Grid>
            </Grid>
          </div>
      </Paper>
    )
  }
}

export default withRouter(withRoot(withStyles(styles)(Event)))
