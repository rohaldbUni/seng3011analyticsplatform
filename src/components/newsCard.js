import React, { Component } from 'react'
import { withStyles } from 'material-ui/styles'
import PropTypes from 'prop-types'
import { CircularProgress } from 'material-ui/Progress'
import { Article } from '../components'
import { prettyDate } from '../time'
import Card, { CardContent, CardHeader } from 'material-ui/Card'

// Styles should go here CSS should go here
const styles = theme => ({
  jsonPane: {
    textAlign: 'left',
  },
  card: {
    margin: theme.spacing.unit
  }
})

class NewsCard extends Component {

  static propTypes = {
    responseJSON: PropTypes.object,
    items: PropTypes.number.isRequired,
    loading: PropTypes.bool.isRequired,
  }

  displayItems(data, num) {
    var items = []
    data.map(function(item, i) {
      const timestamp = prettyDate(new Date(item.webPublicationDate))
      if (num-- >= 0) {
        items.push(<Article key={num}
          title={item.webTitle}
          date={timestamp}
          body={item.fields.bodyText.substring(0, 350).replace(/\s[^\s]*$/, '').replace(/\s*[^a-z]+$/i, '') + ' ... '}
          url={item.webUrl}
          />
        )
      }
      return 0
    })
    return items
  }

  render () {
    const { responseJSON, items, classes, loading } = this.props
    const data = responseJSON ? responseJSON.response.results : null

    return (
      <Card>
        <CardHeader title="Related News"/>
        <CardContent>
          {loading || !data ?
            <CircularProgress className={classes.margin}/>
            :
            this.displayItems(data, items)
          }
        </CardContent>
      </Card>
    )

  }
}

export default withStyles(styles)(NewsCard)