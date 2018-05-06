import React from 'react'
import { withStyles } from 'material-ui/styles'
import withRoot from '../withRoot'
import PropTypes from 'prop-types'
import Grid from 'material-ui/Grid'
import Paper from 'material-ui/Paper'

const styles = theme => ({
    root: {
      flexGrow: 1,
      padding: '4%'
    },
    title: {
        color: 'white',
        marginBottom: '0'
    },
    body: {
        marginTop: '1px'
    }
})

class Article extends React.Component {

  static propTypes = {
    title: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    body: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
  }

  render () {
    const { title, date, body, url } = this.props
    const { classes } = this.props

    return (
      <Grid item xs={12}>
        <Paper className={classes.paper}>
          <div>
            <h2 className={classes.title}>{title}</h2>
            <h4 className={classes.date}>{date}</h4>
            <p className={classes.body}>{body}
              <a target="_blank" href={url}>Read More</a>
            </p>
          </div>
        </Paper>
      </Grid>
    )
  }
}

export default withRoot(withStyles(styles)(Article))