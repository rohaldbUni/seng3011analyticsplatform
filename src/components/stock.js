import React from 'react'
import { withStyles } from 'material-ui/styles'
import withRoot from '../withRoot'
import PropTypes from 'prop-types'
import Card, { CardContent, CardHeader } from 'material-ui/Card'
import { CircularProgress } from 'material-ui/Progress'
import Fade from 'material-ui/transitions/Fade'
import 'amstock3/amcharts/amcharts.js'
import 'amstock3/amcharts/serial.js'
import 'amstock3/amcharts/amstock.js'
import AmCharts from '@amcharts/amcharts3-react'
import 'amstock3/amcharts/themes/light.js'

const styles = theme => ({
  cardHeader: {
    background: 'linear-gradient(60deg, #ef5350, #e53935)'
  }
})

class Stock extends React.Component {

  static propTypes = {
    loading: PropTypes.bool.isRequired,
    stockJSON: PropTypes.object.isRequired,
  }

  /* generate config object for AMCharts */
  config_compare (props, datasets) {
    return {
      "export": {
        "enabled": true,
      },
      "type": "stock",
      "theme": "light",
      "dataSets": datasets,

      "panels": [ {
        "title": "Value",
        "showCategoryAxis": false,
        "percentHeight": 70,
        "valueAxes": [ {
          "id": "v1",
          "dashLength": 5
        } ],

        "categoryAxis": {
          "dashLength": 5,
          /* vertical band displaying the date range of the event */
          "guides": [{
            "lineAlpha": 0,
            "fillColor": "#cc0000",
            "fillAlpha": 0.1,
            "date": props.startDate.toDate(),
            "toDate": props.endDate.toDate(),
          }]
        },

        "stockGraphs": [ {
          "type": "candlestick",
          "id": "g1",
          "openField": "open",
          "closeField": "close",
          "highField": "high",
          "lowField": "low",
          "valueField": "close",
          "lineColor": "#7f8da9",
          "fillColors": "#7f8da9",
          "negativeLineColor": "#db4c3c",
          "negativeFillColors": "#db4c3c",
          "fillAlphas": 1,
          "useDataSetColors": false,
          "comparable": true,
          "compareField": "value",
          "showBalloon": false,
          "proCandlesticks": true
        } ],

        "stockLegend": {
          "valueTextRegular": undefined,
          "periodValueTextComparing": "[[percents.value.close]]%"
        }
      },
      ],

      "chartScrollbarSettings": {
        "graph": "g1",
        "graphType": "line",
        "usePeriod": "WW"
      },

      "chartCursorSettings": {
        "valueLineBalloonEnabled": true,
        "valueLineEnabled": true
      },

      "periodSelector": {
        "position": "bottom",
        "periods": [ {
          "period": "DD",
          "count": 10,
          "label": "10 days"
        }, {
          "period": "MM",
          "count": 1,
          "label": "1 month"
        }, {
          "period": "YYYY",
          "count": 1,
          "label": "1 year"
        }, {
          "period": "YTD",
          "label": "YTD"
        }, {
          "period": "MAX",
          "label": "MAX"
        } ]
      },
      "listeners": [{
        /* automatically zoom onto date range of event, with (1/2 days difference) buffer on each side */
        "event": "dataUpdated",
        "method": function(e) {
          let origStartDate = props.startDate
          let origEndDate = props.endDate /* use today's date if ongoing */

          /* number of days difference between origStartDate and origEndDate */
          let timeDifference = origEndDate.diff(origStartDate, 'days')
          let bufferDistance = timeDifference / 2

          let startDate = origStartDate.subtract(bufferDistance, 'days').toDate()
          let endDate = origEndDate.add(bufferDistance, 'days').toDate()

          e.chart.zoom(startDate, endDate)
        }
      }, {
        "event": "rendered",
        "method": function(e) {
          /* use amcharts native export to generate image for pdf generation */
          var interval = setInterval(function() {
            if (window.fabric) {
              clearTimeout(interval)
              e.chart['export'].capture({}, function() {
                this.toJPG({}, function(base64) {
                  if (!document.getElementById('stock-img')) {
                    /* add image data from export to a hidden div for easy of access */
                    var div = document.createElement('div')
                    div.innerHTML = base64
                    div.setAttribute('id', 'stock-img')
                    div.setAttribute('style', 'display:none')
                    document.getElementById('stock').appendChild(div)
                  }
                })
              })
            }
          }, 100)
        }
      }]
    }
  }

  /* generate stock chart data */
  declareConfig = () => {
    let stockJSON = this.props.stockJSON
    let companyDatasets = []
    for (let companyCode in stockJSON) {
      if (stockJSON.hasOwnProperty(companyCode)) {
        let companyJSON = {
          "fieldMappings": [
            {
              "fromField": "value",
              "toField": "value"
            }
          ],
          "dataProvider": stockJSON[companyCode],
          "title": companyCode,
          "categoryField": "date",
          "compared": true,
        }

        companyDatasets.push(companyJSON)
      }
    }

    let config = this.config_compare(this.props, companyDatasets)

    return config
  }

  render () {
    const { classes, loading } = this.props

    return (
      <Fade in timeout={500}>
        <Card>
          <CardHeader
            title="Stock Comparison"
            className={classes.cardHeader}
          />
          <CardContent>
            {loading ?
              <div style={{textAlign: 'center'}}>
                <CircularProgress />
              </div>
            :
              <Fade in timeout={500}>
                <div id="stock">
                  <AmCharts.React className="stockChart" style={{ width: "100%", height: "500px" }} options={this.declareConfig()} />
                </div>
              </Fade>
            }
          </CardContent>
        </Card>
      </Fade>
    )
  }
}

export default withRoot(withStyles(styles)(Stock))
