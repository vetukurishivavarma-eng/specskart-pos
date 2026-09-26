import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native'
import { api, apiError } from '../src/lib/api'
import { colors, font, spacing } from '../src/theme'
import { Button, Card, Field, Loading, Title } from '../src/ui/components'

type Faq = { id: string; title: string; question: string; answer: string; sortOrder: number }

/** The FAQ list customers see in WhatsApp (menu → FAQs). Admin-only on the server too. */
export default function Faqs() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => (await api.get<Faq[]>('/admin/faqs')).data,
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['faqs'] })

  if (isLoading) return <Loading />

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={data}
      keyExtractor={(f) => f.id}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md, gap: spacing.md }}>
          <Title>WhatsApp FAQs</Title>
          <Text style={styles.muted}>Customers tap "FAQs" in the chat and pick a question. Past 10 questions, WhatsApp pages them with a "More questions" row.</Text>
          <Editor onSaved={refresh} />
        </View>
      }
      renderItem={({ item }) => <Editor faq={item} onSaved={refresh} />}
    />
  )
}

function Editor({ faq, onSaved }: { faq?: Faq; onSaved: () => void }) {
  const [title, setTitle] = useState(faq?.title ?? '')
  const [question, setQuestion] = useState(faq?.question ?? '')
  const [answer, setAnswer] = useState(faq?.answer ?? '')
  const [saving, setSaving] = useState(false)
  const dirty = !faq || title !== faq.title || question !== faq.question || answer !== faq.answer

  async function save() {
    setSaving(true)
    try {
      if (faq) await api.patch(`/admin/faqs/${faq.id}`, { title, question, answer })
      else {
        await api.post('/admin/faqs', { title, question, answer })
        setTitle(''); setQuestion(''); setAnswer('')
      }
      onSaved()
    } catch (e) {
      Alert.alert('Could not save', apiError(e))
    } finally {
      setSaving(false)
    }
  }

  function remove() {
    Alert.alert('Delete this FAQ?', faq!.question, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/admin/faqs/${faq!.id}`); onSaved() } catch (e) { Alert.alert('Could not delete', apiError(e)) }
      } },
    ])
  }

  return (
    <Card style={{ marginBottom: spacing.md, gap: spacing.sm }}>
      {!faq && <Text style={styles.label}>Add a question</Text>}
      <Field label={`Button text (${title.length}/24)`} value={title} onChangeText={setTitle} placeholder="e.g. Insurance" />
      <Field label={`Question (${question.length}/72)`} value={question} onChangeText={setQuestion} placeholder="e.g. Do you take insurance?" />
      <Field label="Answer" value={answer} onChangeText={setAnswer} multiline />
      <View style={styles.actions}>
        {faq && <Button label="Delete" variant="ghost" onPress={remove} />}
        {dirty && <Button label={faq ? 'Save' : 'Add'} onPress={save} loading={saving}
          disabled={saving || !title.trim() || !question.trim() || !answer.trim()} />}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  label: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  muted: { fontFamily: font.regular, fontSize: 12, color: colors.textMuted },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
})
