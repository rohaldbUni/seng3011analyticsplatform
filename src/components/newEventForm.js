import React from 'react'
import { withStyles } from 'material-ui/styles'
import withRoot from '../withRoot'
import IconButton from '@material-ui/core/IconButton'
import { Delete } from 'material-ui-icons'
import moment from 'moment'
import { fb } from '../config'
import _ from 'lodash'
import Typography from 'material-ui/Typography'
import PropTypes from 'prop-types'
import Dialog, {
  DialogContent,
  DialogTitle,
  DialogActions
} from 'material-ui/Dialog'
import { Close } from 'material-ui-icons'
import Snackbar from '@material-ui/core/Snackbar'
import ChipInput from 'material-ui-chip-input'
import Button from 'material-ui/Button'
import TextField from 'material-ui/TextField'
import InputLabel from '@material-ui/core/InputLabel'
import FormControl from '@material-ui/core/FormControl'
import Select from '@material-ui/core/Select'

const styles = theme => ({
  textField: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit,
    marginTop: theme.spacing.unit
  },
  button: {
    margin: theme.spacing.unit
  },
  formControl: {
    margin: theme.spacing.unit,
    minWidth: 120
  }
})

class NewEventForm extends React.Component {

  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    closeCallback: PropTypes.func.isRequired
  }

  state = {
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    related_companies: {},
    keywords: [],
    category: 'other',
    companyCode: '',
    companyName: '',
    invalid: '',
    snackbarOpen: false
  }

  handleClose = () => {
    this.resetFields()
    this.props.closeCallback()
  }

  resetFields = () => {
    this.setState({
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      related_companies: {},
      keywords: [],
      category: 'other',
      companyCode: '',
      companyName: '',
      invalid: ''
    })
  }

  addEvent = () => {
    let {
      name,
      description,
      start_date,
      end_date,
      related_companies,
      keywords,
      category
    } = this.state

    if (name === '' || description === '' || start_date === '' || end_date === '') {
      this.setState({invalid: 'Fields marked * are required.'})
    } else {
      const start = moment(start_date)
      const end = moment(end_date)
      if (!end.isAfter(start)) {
        this.setState({invalid: 'Start date must precede end date.'})
      } else {
        let keywordsHash = {}
        _.map(keywords, (keyword, i) => keywordsHash[i] = keyword)

        fb.database().ref('timeline/' + Math.random().toString(36).substr(2, 5)).set({
          description,
          start_date: start.unix(),
          end_date: end.unix(),
          keywords: keywordsHash,
          category,
          name,
          related_companies
        })

        this.resetFields()
        this.setState({snackbarOpen: true})
        this.props.closeCallback()
      }
    }
  }

  handleChange = name => event => {
    this.setState({
      [name]: event.target.value
    })
  }

  removeChip = (chip, i) => {
    let newKeyWords = this.state.keywords
    newKeyWords.splice(i,1)
    this.setState({keywords: newKeyWords})
  }

  addChip = (chip) =>
    this.state.keywords.length < 4 ? this.setState({keywords: [...this.state.keywords, chip]}) : null

  addNewCompany = () => {
    if (this.state.companyName.match(/^\s*$/) || this.state.companyCode.match(/^\s*$/)) {
      this.setState({invalid: 'Enter both a name and code first.'})
    } else {
      let related_companies = this.state.related_companies
      related_companies[this.state.companyName] = this.state.companyCode
      this.setState({
        related_companies,
        companyName: '',
        companyCode: ''
      })
    }
  }

  deleteRelatedCompany = (key) => {
    let related_companies = this.state.related_companies
    delete related_companies[key]
    this.setState({related_companies})
  }

  handleClick = () => {
    this.setState({ snackbarOpen: true })
  }

  snackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return
    }
    this.setState({ snackbarOpen: false })
  }

  render () {
    const { classes } = this.props
    const { related_companies } = this.state

    return (
      <div>
      <Dialog open={this.props.isOpen} onClose={this.handleClose} aria-labelledby="simple-dialog-title" >
        <DialogTitle id="simple-dialog-title">Create New Event</DialogTitle>
        <DialogContent>
          <form>
            <TextField
              required
              id="name"
              label="Name"
              className={classes.textField}
              value={this.state.name}
              onChange={this.handleChange('name')}
              margin="normal"
              fullWidth
            />

            <TextField
              required
              id="description"
              label="Description"
              multiline
              fullWidth
              className={classes.textField}
              value={this.state.description}
              onChange={this.handleChange('description')}
              margin="normal"
            />
            <TextField
              required
              label="Start Date"
              type="date"
              value={this.state.start_date}
              onChange={this.handleChange('start_date')}
              className={classes.textField}
              InputLabelProps={{
                shrink: true
              }}
            />
            <TextField
              required
              label="End Date"
              type="date"
              value={this.state.end_date}
              onChange={this.handleChange('end_date')}
              className={classes.textField}
              InputLabelProps={{
                shrink: true
              }}
            />

            <FormControl className={classes.formControl}>
              <InputLabel htmlFor="category-simple">Category</InputLabel>
              <Select
                native
                value={this.state.category}
                onChange={this.handleChange('category')}
                inputProps={{
                  id: 'category-simple'
                }}
              >
                {_.map(this.props.categories, (k) =>
                    k === 'uncategorised' ? null :
                      <option value={k} key={k}>{_.startCase(_.toLower(k))}</option>
                )}
              </Select>
            </FormControl>

            <ChipInput
              label="Keywords"
              value={this.state.keywords}
              onAdd={(chip) => this.addChip(chip)}
              className={classes.textField}
              fullWidth
              onDelete={(chip, i) => this.removeChip(chip, i)}
            />

            <div className={classes.textField}>
              <Typography gutterBottom variant="subheading">
                Related Companies:
              </Typography>
              {_.map(_.keys(related_companies), (key, i) => (
                <div key={i}>
                  <Typography style={{display: 'inline'}}>
                    {key}, {related_companies[key]}
                  </Typography>
                  <IconButton
                    className={classes.button} aria-label="Delete"
                    onClick={() => this.deleteRelatedCompany(key)}
                  >
                    <Delete/>
                  </IconButton>
                </div>
              ))}
            </div>

            <TextField
              label="Company Name"
              className={classes.textField}
              value={this.state.companyName}
              onChange={this.handleChange('companyName')}
              margin="normal"
            />
            <TextField
              label="Stock Code"
              className={classes.textField}
              value={this.state.companyCode}
              onChange={this.handleChange('companyCode')}
              margin="normal"
            />
            <Button
              size="small"
              onClick={() => this.addNewCompany()}
            >
              Add
            </Button>
          </form>
          {this.state.invalid !== '' ?
            <Typography gutterBottom variant="subheading">
              <i>{this.state.invalid}</i>
            </Typography>
          : null}
          </DialogContent>
          <DialogActions>
            <Button
              size="medium"
              color="secondary"
              onClick={() => this.addEvent()}
            >
              Add Event
            </Button>
          </DialogActions>
      </Dialog>
      <Snackbar
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left'
        }}
        open={this.state.snackbarOpen}
        autoHideDuration={4000}
        onClose={this.snackbarClose}
        ContentProps={{
          'aria-describedby': 'message-id'
        }}
        message={<span id="message-id">A new event has been added to your favourite category.</span>}
        action={[
          <IconButton
            key="close"
            aria-label="Close"
            color="inherit"
            className={classes.close}
            onClick={this.snackbarClose}
          >
            <Close />
          </IconButton>
        ]}
      />
    </div>
    )
  }
}

export default withRoot(withStyles(styles)(NewEventForm))
